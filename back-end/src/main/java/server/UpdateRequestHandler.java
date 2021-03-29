package server;

import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import index.*;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import javax.net.ssl.HttpsURLConnection;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import org.apache.commons.io.output.ByteArrayOutputStream;
import project.*;

/** Created by peter on 08/24/20 */
public class UpdateRequestHandler implements HttpHandler {

    /**
     * UpdateRequestHandler serves requests to /update
     * Given a canvas, layer, and information about the transform,
     * the handler will udpate the data for the relevant
     * layer/canvas and propagate those updates to the index tables
     * and/or up to higher levels if hierarchical
     */

    private final Gson gson;

    public UpdateRequestHandler() {
        gson = new GsonBuilder().create();
    }

    private static HashMap<String, String> zipLists(
            ArrayList<String> attrNames, ArrayList<String> attrVals) {
        assert (attrNames.size() == attrVals.size());
        HashMap<String, String> attrMap = new HashMap<String, String>();
        for (int i = 0; i < attrNames.size(); i++) {
            String name = attrNames.get(i);
            String val = attrVals.get(i);
            attrMap.put(name, val);
        }
        return attrMap;
    }

    private ArrayList<String> filterTransformColumns(Transform trans, ArrayList<String> columns)
            throws SQLException, ClassNotFoundException {
        ArrayList<String> columnsInTable = new ArrayList<String>();
        ArrayList<String> transColumns = trans.getColumnNames();
        for (String col : columns) {
            if (transColumns.contains(col)) {
                columnsInTable.add(col);
            }
        }
        return columnsInTable;
    }

    private HashMap<String, String> filterObjectAttrs(
            Set<String> colList, HashMap<String, String> objAttrs)
            throws SQLException, ClassNotFoundException {
        HashMap<String, String> attrsInTable = new HashMap<String, String>();
        for (String col : objAttrs.keySet()) {
            if (colList.contains(col)) {
                attrsInTable.put(col, objAttrs.get(col));
            }
        }
        return attrsInTable;
    }

    private String generateKeySubQuery(
            HashMap<String, String> objectAttrs,
            HashMap<String, String> attrColumnTypes,
            ArrayList<String> keyColumns,
            boolean isTransformQuery) {
        String keyCondition;
        if (isTransformQuery) {
            keyCondition = " WHERE ";
        } else {
            keyCondition = " WHERE t.";
        }

        int i = 0;
        for (String key : keyColumns) {
            String keyColumnType = attrColumnTypes.get(key);
            switch (keyColumnType) {
                case "double precision":
                    keyCondition += key + "=" + objectAttrs.get(key);
                    break;
                case "integer":
                    keyCondition += key + "=" + objectAttrs.get(key);
                    break;
                case "text":
                    keyCondition += key + "='" + objectAttrs.get(key) + "'";
                    break;
                default:
                    // default is same as text column, most common
                    keyCondition += key + "='" + objectAttrs.get(key) + "'";
                    break;
            }
            if (i < (keyColumns.size() - 1)) {
                if (isTransformQuery) {
                    keyCondition += " AND ";
                } else {
                    keyCondition += " AND t.";
                }
            }
            i++;
        }

        return keyCondition;
    }

    private String createUpdateQuery(
            String tableName,
            HashMap<String, String> objectAttrs,
            HashMap<String, String> attrColumnTypes,
            ArrayList<String> keyColumns,
            boolean isTransform) {
        String colName;
        String colType;
        Set<String> attrNames = objectAttrs.keySet();
        String updateQuery = "UPDATE " + tableName + " as t SET ";
        String restQuery = "";
        String valuesSubQuery = "(";
        String columnSubQuery = "c(";
        Iterator<String> attrNameIterator = attrNames.iterator();
        while (attrNameIterator.hasNext()) {
            colName = attrNameIterator.next();
            colType = attrColumnTypes.get(colName);
            restQuery += colName + "=" + "c." + colName;

            columnSubQuery += colName;
            switch (colType) {
                case "double precision":
                    valuesSubQuery += objectAttrs.get(colName);
                    break;
                case "integer":
                    valuesSubQuery += objectAttrs.get(colName);
                    break;
                case "text":
                    valuesSubQuery += "'" + objectAttrs.get(colName) + "'";
                    break;
                default:
                    // default is same as text column, most common
                    valuesSubQuery += "'" + objectAttrs.get(colName) + "'";
                    break;
            }
            if (attrNameIterator.hasNext()) {
                restQuery += ", ";
                columnSubQuery += ", ";
                valuesSubQuery += ", ";
            }
        }
        valuesSubQuery += ")";
        columnSubQuery += ")";
        // add subqueries to update query
        restQuery += " FROM (values " + valuesSubQuery + " )";
        restQuery += " AS " + columnSubQuery;
        String keyCondition =
                generateKeySubQuery(objectAttrs, attrColumnTypes, keyColumns, isTransform);
        restQuery += keyCondition;

        restQuery += ";";
        updateQuery += restQuery;

        return updateQuery;
    }

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {
        System.out.println("Serving /update");
        try {
            String response;
            String canvasId;
            String layerId;
            ArrayList<String> keyColumns;
            HashMap<String, String> objectAttrs;
            String baseTable;
            String projName;

            // should be a POST request
            if (!httpExchange.getRequestMethod().equalsIgnoreCase("POST")) {
                Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
                return;
            }

            InputStreamReader isr = new InputStreamReader(httpExchange.getRequestBody(), "utf-8");
            BufferedReader br = new BufferedReader(isr);
            String projectJSON = br.readLine();
            UpdateRequest updateRequest = gson.fromJson(projectJSON, UpdateRequest.class);

            canvasId = updateRequest.getCanvasId();
            layerId = updateRequest.getLayerId();
            keyColumns = updateRequest.getKeyColumns();
            objectAttrs = updateRequest.getObjectAttributes();
            baseTable = updateRequest.getBaseTable();
            projName = updateRequest.getProjectName();
            int fetchedRows = 0;

            long startTime = System.currentTimeMillis();
            System.out.println("object attrs: " + objectAttrs);

            String tableName =
                    "bbox_" + Main.getProject().getName() + "_" + canvasId + "layer" + layerId;
            Canvas c = Main.getProject().getCanvas(canvasId);
            int layerIdNum = Integer.parseInt(layerId);
            Layer l = c.getLayers().get(layerIdNum);
            Transform trans = l.getTransform();

            // get types of kyrix index table, will just be text for all columns in base table
            // and double precision for the bbox coordinates/placement
            HashMap<String, String> attrColumnTypes = new HashMap<String, String>();
            Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
            String typeQuery =
                    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = "
                            + "'"
                            + tableName
                            + "';";
            ResultSet rs = stmt.executeQuery(typeQuery);
            String colName;
            String colType;
            // String baseColType;
            // Set<String> attrNames = objectAttrs.keySet();
            while (rs.next()) {
                // Note: getString is 1-indexed, so the 1st column is 1, etc.
                colName = rs.getString(1);
                colType = rs.getString(2);
                attrColumnTypes.put(colName, colType);
            }

            // get types of base data table, can be any type of data, which we will have to cast the
            // text data into
            HashMap<String, String> baseAttrColTypes = new HashMap<String, String>();
            Statement baseStmt = DbConnector.getStmtByDbName(projName);
            typeQuery =
                    "SELECT column_name, data_type  FROM information_schema.columns WHERE table_name = "
                            + "'"
                            + baseTable
                            + "';";
            ResultSet baseRs = baseStmt.executeQuery(typeQuery);
            while (baseRs.next()) {
                colName = baseRs.getString(1);
                colType = baseRs.getString(2);
                baseAttrColTypes.put(colName, colType);
            }

            String updateQuery =
                    createUpdateQuery(tableName, objectAttrs, attrColumnTypes, keyColumns, false);
            HashMap<String, String> baseObjectAttrs =
                    filterObjectAttrs(baseAttrColTypes.keySet(), objectAttrs);
            String baseUpdateQuery =
                    createUpdateQuery(
                            baseTable, baseObjectAttrs, baseAttrColTypes, keyColumns, false);

            stmt.executeUpdate(updateQuery);
            baseStmt.executeUpdate(baseUpdateQuery);

            double midTime = System.currentTimeMillis() - startTime;
            fetchedRows++;
            fetchedRows++;
            Server.sendStats(projName, canvasId, "update1", midTime, 1);

            if (trans.getDependencies().size() == 0) {
                double timeDiff = System.currentTimeMillis() - startTime;
                System.out.println("end-to-end update on canvas: "
                      + canvasId + "and layer: "
                      + layerId + " took " + timeDiff + " ms");
                Server.sendStats(projName, canvasId, "update", timeDiff, fetchedRows);
                stmt.close();
                baseStmt.close();
                Map<String, Object> respMap = new HashMap<>();
                response = gson.toJson(respMap);
                Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
                return;
            }

            long preSetup = System.currentTimeMillis();
            // re-run transform for the current layer
            // step 1: set up nashorn environment for running javascript code
            NashornScriptEngine engine = setupMultipleTransformNashorn(trans);
            long setupTimeDiff = System.currentTimeMillis() - preSetup;
            Server.sendStats(projName, canvasId, "setup-transform", setupTimeDiff, 0);
            int transformFuncId = 0;

            long currLvlTime = System.currentTimeMillis();
            String transDb = projName;
            String baseTransQuery = trans.getQuery();
            baseTransQuery = baseTransQuery.replaceAll(";", "");
            String keyCondition =
                    generateKeySubQuery(objectAttrs, baseAttrColTypes, keyColumns, true);
            keyCondition += ";";
            baseTransQuery += keyCondition;
            rs = DbConnector.getQueryResultIterator(baseStmt, baseTransQuery);
            int rowCount = 0;
            boolean isNullTransform = trans.getTransformFunc().equals("");
            int numColumn = rs.getMetaData().getColumnCount();

            while (rs.next()) {
                rowCount++;
                ArrayList<String> curRawRow = new ArrayList<>();
                for (int i = 1; i <= numColumn; i++)
                    curRawRow.add(rs.getString(i) == null ? "" : rs.getString(i));

                // step 3: run transform function on this tuple
                ArrayList<String> transformedRow =
                        isNullTransform
                                ? curRawRow
                                : getTransformedRow(c, curRawRow, engine, transformFuncId);

                assert (transformedRow.size() == trans.getColumnNames().size());
                ArrayList<String> transformedColNames = trans.getColumnNames();
                HashMap<String, String> transformedColMap =
                        zipLists(transformedColNames, transformedRow);
                String rerunTransformQuery =
                        createUpdateQuery(
                                tableName, transformedColMap, attrColumnTypes, keyColumns, false);

                stmt.executeUpdate(rerunTransformQuery);

                fetchedRows++;
            }
            double currLvlDiff = System.currentTimeMillis() - currLvlTime;

            Server.sendStats(projName, canvasId, "transform1", currLvlDiff, 1);

            // re-run higher level transforms
            ArrayList<ArrayList<String>> dependencies = trans.getDependencies();
            transformFuncId++;
            // dependencies are lists like [[1, "usmap0_state"]] where 1 is the layerId and
            // "usmap0_state" is the canvasId
            long depLvlTime = System.currentTimeMillis();
            for (ArrayList<String> dep : dependencies) {
                assert (dep.size() == 2);
                String depLayerId = dep.get(0);
                String depCanvasId = dep.get(1);
                String depTableName =
                        "bbox_"
                                + Main.getProject().getName()
                                + "_"
                                + depCanvasId
                                + "layer"
                                + depLayerId;

                Canvas depCanvas = Main.getProject().getCanvas(depCanvasId);
                int depLayerIdNum = Integer.parseInt(depLayerId);
                Layer depLayer = depCanvas.getLayers().get(depLayerIdNum);
                Transform depTrans = depLayer.getTransform();
                String depTransQuery = depTrans.getQuery();
                depTransQuery = depTransQuery.replaceAll(";", "");
                ArrayList<String> depKeyColumns = filterTransformColumns(depTrans, keyColumns);
                String depKeyCondition =
                        generateKeySubQuery(objectAttrs, baseAttrColTypes, depKeyColumns, true);
                depKeyCondition += ";";
                depTransQuery += depKeyCondition;
                rs = DbConnector.getQueryResultIterator(baseStmt, depTransQuery);
                rowCount = 0;
                isNullTransform = depTrans.getTransformFunc().equals("");
                numColumn = rs.getMetaData().getColumnCount();
                while (rs.next()) {
                    rowCount++;
                    ArrayList<String> preTransformRow = new ArrayList<>();

                    for (int i = 1; i <= numColumn; i++) {
                        preTransformRow.add(rs.getString(i) == null ? "" : rs.getString(i));
                    }

                    ArrayList<String> transformedRow =
                            isNullTransform
                                    ? preTransformRow
                                    : getTransformedRow(
                                            depCanvas, preTransformRow, engine, transformFuncId);
                    
                    assert (transformedRow.size() == trans.getColumnNames().size());
                    HashMap<String, String> depTransformColMap =
                            zipLists(depTrans.getColumnNames(), transformedRow);
                    String depTransUpdateQuery =
                            createUpdateQuery(
                                    depTableName,
                                    depTransformColMap,
                                    attrColumnTypes,
                                    depKeyColumns,
                                    false);

                    depLvlTime = System.currentTimeMillis();
                    stmt.executeUpdate(depTransUpdateQuery);
                    fetchedRows++;
                }
                transformFuncId++;
            }
            double depLvlDiff = System.currentTimeMillis() - depLvlTime;
            Server.sendStats(projName, canvasId, "transform2", depLvlDiff, 1);

            double timeDiff = System.currentTimeMillis() - startTime;
            Server.sendStats(projName, canvasId, "update", timeDiff, fetchedRows);
            System.out.println("end-to-end update on canvas: "
                      + canvasId + "and layer: "
                      + layerId + " took " + timeDiff + " ms");
            System.out.println();
            stmt.close();
            baseStmt.close();
            Map<String, Object> respMap = new HashMap<>();
            response = gson.toJson(respMap);
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("\n\n" + e.getMessage() + "\n");
            Server.printServingErrorMessage();
        }
    }

    protected NashornScriptEngine setupMultipleTransformNashorn(Transform trans) throws Exception {
        NashornScriptEngine engine = null;

        ArrayList<ArrayList<String>> dependencies = trans.getDependencies();
        ArrayList<String> transformFuncs = new ArrayList<String>();
        transformFuncs.add(trans.getTransformFunc());

        for (ArrayList<String> dep : dependencies) {
            assert (dep.size() == 2);
            String depLayerId = dep.get(0);
            String depCanvasId = dep.get(1);
            Canvas depCanvas = Main.getProject().getCanvas(depCanvasId);
            int depLayerIdNum = Integer.parseInt(depLayerId);
            Layer depLayer = depCanvas.getLayers().get(depLayerIdNum);
            Transform depTrans = depLayer.getTransform();
            transformFuncs.add(depTrans.getTransformFunc());
        }

        try {
            engine = setupNashorn(transformFuncs);
        } catch (Exception e) {
            throw new Exception("nashorn initialization went wrong: " + e.getMessage());
        }

        return engine;
    }

    protected static NashornScriptEngine setupNashorn(ArrayList<String> transformFuncs)
            throws ScriptException {

        NashornScriptEngine engine =
                (NashornScriptEngine) new ScriptEngineManager().getEngineByName("nashorn");
        FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
        Require.enable(engine, rootFolder);

        // register the data transform function with nashorn
        String script =
                "var d3 = require('d3');\n";

        String transformStrings = "";
        int count = 0;
        for (String transformFuncStr : transformFuncs) {
            transformStrings +=
                    "var trans" + String.valueOf(count) + " = " + transformFuncStr + ";\n";
            count++;
        }
        script += transformStrings;

        engine.eval(script);
        engine.put("renderingParams", Main.getProject().getRenderingParams());

        return engine;
    }

    // run the transformed function on a row to get a transformed row
    protected static ArrayList<String> getTransformedRow(
            Canvas c, ArrayList<String> row, NashornScriptEngine engine, int funcIdx)
            throws ScriptException, NoSuchMethodException {

        String funcName = "trans" + String.valueOf(funcIdx);
        ArrayList<String> transRow = new ArrayList<>();
        JSObject renderingParamsObj = (JSObject) engine.eval("JSON.parse(renderingParams)");
        String[] strArray =
                (String[])
                        engine.invokeFunction(
                                funcName, row, c.getW(), c.getH(), renderingParamsObj);
        for (int i = 0; i < strArray.length; i++) transRow.add(strArray[i]);

        return transRow;
    }
}
