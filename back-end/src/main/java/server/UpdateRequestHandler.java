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
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("\n\n" + e.getMessage() + "\n");
            Server.printServingErrorMessage();
        }
    }
}
