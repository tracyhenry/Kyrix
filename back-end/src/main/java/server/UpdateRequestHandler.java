package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import jdk.nashorn.api.scripting.JSObject;
import java.io.File;


import org.apache.commons.io.output.ByteArrayOutputStream;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.ArrayList;
import java.util.Map;
import java.util.Properties;
import java.util.List;
import java.util.Set;
import jdk.nashorn.api.scripting.NashornScriptEngine;


import index.*;
import javax.net.ssl.HttpsURLConnection;
import main.Config;
import main.DbConnector;
import main.Main;
import project.*;

public class UpdateRequestHandler implements HttpHandler {
    
    private final Gson gson;

    public UpdateRequestHandler() {
        gson = new GsonBuilder().create();
    }

    private static HashMap<String, String> zipLists(ArrayList<String> attrNames, ArrayList<String> attrVals) {
      assert(attrNames.size() == attrVals.size());
      HashMap<String, String> attrMap = new HashMap<String,String>();
      for (int i=0; i < attrNames.size(); i++) {
        String name = attrNames.get(i);
        String val = attrVals.get(i);
        attrMap.put(name, val);
      }
      return attrMap;
    }

    private ArrayList<String> filterTransformColumns(Transform trans, ArrayList<String> columns) throws SQLException, ClassNotFoundException {
      ArrayList<String> columnsInTable = new ArrayList<String>();
      ArrayList<String> transColumns = trans.getColumnNames();
      for (String col : columns) {
        if (transColumns.contains(col)) {
          columnsInTable.add(col);
        }
      }
      return columnsInTable;
    }

    private String generateKeySubQuery(HashMap<String,String> objectAttrs, HashMap<String,String> attrColumnTypes, ArrayList<String> keyColumns, boolean isTransformQuery) {
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

    private String createUpdateQuery(String tableName,  HashMap<String, String> objectAttrs, HashMap<String, String> attrColumnTypes, ArrayList<String> keyColumns, boolean isTransform) {
      String colName;
      String colType;
      Set<String> attrNames = objectAttrs.keySet();
      String updateQuery = 
                "UPDATE " + tableName + " as t SET ";
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
      String keyCondition = generateKeySubQuery(objectAttrs, attrColumnTypes, keyColumns, isTransform);
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

            // get body data of POST request
            // String body = new String(readBody(httpExchange), "utf-8");
            // extract project object & headers
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

            long startTime = System.currentTimeMillis();
            System.out.println("object attrs: " + objectAttrs);

            long currTime = System.currentTimeMillis();
            String tableName = "bbox_" + Main.getProject().getName()
                                     + "_" + canvasId + "layer" + layerId;
            
            // get types of kyrix index table, will just be text for all columns in base table
            // and double precision for the bbox coordinates/placement
            HashMap<String, String> attrColumnTypes = new HashMap<String, String>();
            Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
            String typeQuery = 
                    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = "
                    + "'" + tableName + "';";
            ResultSet rs = stmt.executeQuery(typeQuery);
            String colName;
            String colType;
            String baseColType;
            Set<String> attrNames = objectAttrs.keySet();
            while (rs.next()) {
                // Note: getString is 1-indexed, so the 1st column is 1, etc.
                colName = rs.getString(1);
                colType = rs.getString(2);
                System.out.println("colName, colType -> " + colName + ", " + colType);
                // if (attrNames.contains(colName)) {
                    attrColumnTypes.put(colName, colType);
                // }
            }
            System.out.println("column types -> " + attrColumnTypes);

            // get types of base data table, can be any type of data, which we will have to cast the text data into
            HashMap<String, String> baseAttrColTypes = new HashMap<String, String>();
            Statement baseStmt = DbConnector.getStmtByDbName(projName);
            typeQuery = 
                  "SELECT column_name, data_type  FROM information_schema.columns WHERE table_name = "
                    + "'" + baseTable + "';";
            ResultSet baseRs = baseStmt.executeQuery(typeQuery);
            while (baseRs.next()) {
              colName = baseRs.getString(1);
              colType = baseRs.getString(2);
              System.out.println("[base] colName, colType -> " + colName + ", " + colType);
              // if (attrNames.contains(colName)) {
                baseAttrColTypes.put(colName, colType);
              // }
            }
            System.out.println("base column types -> " + baseAttrColTypes);

            String updateQuery = createUpdateQuery(tableName, objectAttrs, attrColumnTypes, keyColumns, false);
            String baseUpdateQuery = createUpdateQuery(baseTable, objectAttrs, baseAttrColTypes, keyColumns, false);

            
            // baseUpdateQuery += restQuery;
            System.out.println("Kyrix Index Update Query: " + updateQuery);
            stmt.executeUpdate(updateQuery);
            // stmt.close();
            System.out.println("Base table update query: " + baseUpdateQuery);
            baseStmt.executeUpdate(baseUpdateQuery);

            double midTime = System.currentTimeMillis() - startTime;
            double midTimeSec = midTime / 1000.0;
            System.out.println("updating up to re-running transform took: " + midTimeSec + " sec.");

            // now re-run transform on the relevant rows in the Kyrix index table
            // only update the rows that are selected by the key columns
            // Layer l = c.getLayers().get(layerId);
            Canvas c = Main.getProject().getCanvas(canvasId);
            int layerIdNum = Integer.parseInt(layerId);
            Layer l = c.getLayers().get(layerIdNum);
            Transform trans = l.getTransform();
            System.out.println("data dependencies for layer " + layerIdNum + " is: " + trans.getDependencies());
            
            // re-run transform for the current layer
            // step 1: set up nashorn environment for running javascript code
            NashornScriptEngine engine = setupMultipleTransformNashorn(trans);
            int transformFuncId = 0;

            String transDb = projName;
            String baseTransQuery = trans.getQuery();
            baseTransQuery = baseTransQuery.replaceAll(";", "");
            String keyCondition = generateKeySubQuery(objectAttrs, baseAttrColTypes, keyColumns, true);
            keyCondition += ";";
            baseTransQuery += keyCondition;
            System.out.println("db=" + transDb + " - query=" + baseTransQuery);
            // Statement rawDBStmt = DbConnector.getStmtByDbName(transDb, true);
            rs = DbConnector.getQueryResultIterator(baseStmt, baseTransQuery);
            int rowCount = 0;
            boolean isNullTransform = trans.getTransformFunc().equals("");
            int numColumn = rs.getMetaData().getColumnCount();

            while (rs.next()) {

              // count log - important to increment early so modulo-zero doesn't trigger on first
              // iteration
              rowCount++;
  
              // get raw row
              ArrayList<String> curRawRow = new ArrayList<>();
              for (int i = 1; i <= numColumn; i++)
                  curRawRow.add(rs.getString(i) == null ? "" : rs.getString(i));
  
              long currLvlTime = System.currentTimeMillis();
              // step 3: run transform function on this tuple
              ArrayList<String> transformedRow =
                      isNullTransform ? curRawRow : getTransformedRow(c, curRawRow, engine, transformFuncId);

              double currLvlDiff = System.currentTimeMillis() - currLvlTime;
              double currLvlSec = currLvlDiff / 1000.0;
              System.out.println("current level transform took: " + currLvlDiff + " ms and took: " + currLvlSec + " sec");
              System.out.println();
              System.out.println("[UpdateRequestHandler] re-running transform, row: "
                                   + rowCount + " has values: " + transformedRow);
              System.out.println("[UpdateRequestHandler] column names are: " + trans.getColumnNames());
              assert(transformedRow.size() == trans.getColumnNames().size());
              ArrayList<String> transformedColNames = trans.getColumnNames();
              HashMap<String,String> transformedColMap = zipLists(transformedColNames, transformedRow);
              String rerunTransformQuery = createUpdateQuery(tableName, transformedColMap, attrColumnTypes, keyColumns, false);

              System.out.println();
              System.out.println("[UpdateRequestHandler] re-run transform query: " +  rerunTransformQuery);
              currLvlTime = System.currentTimeMillis();
              stmt.executeUpdate(rerunTransformQuery);
              currLvlDiff = System.currentTimeMillis() - currLvlTime;
              currLvlSec = currLvlDiff / 1000.0;
              System.out.println("current level kyrix index update query took: " + currLvlDiff + " ms and took: " + currLvlSec + " sec");
              System.out.println();
            }

            // re-run higher level transforms
            ArrayList<ArrayList<String>> dependencies = trans.getDependencies();
            transformFuncId++;
            // dependencies are structures like [[1, "usmap0_state"]] where 1 is the layerId and "usmap0_state" is the canvasId
            System.out.println();
            for (ArrayList<String> dep : dependencies) {
              assert(dep.size() == 2);
              String depLayerId = dep.get(0);
              String depCanvasId = dep.get(1);
              String depTableName = "bbox_" + Main.getProject().getName()
                                     + "_" + depCanvasId + "layer" + depLayerId;
              System.out.println("processing dependency with layerId: " + depLayerId + " and canvasId: " + depCanvasId + " and tableName: " + depTableName);
              
              // TODO?: recurse through dependent transforms to propagate changes to current tranform
              // this only handles having one level of dependency...
              Canvas depCanvas = Main.getProject().getCanvas(depCanvasId);
              int depLayerIdNum = Integer.parseInt(depLayerId);
              Layer depLayer = depCanvas.getLayers().get(depLayerIdNum);
              Transform depTrans = depLayer.getTransform();
              String depTransDb = projName;
              String depTransQuery = depTrans.getQuery();
              depTransQuery = depTransQuery.replaceAll(";", "");
              ArrayList<String> depKeyColumns = filterTransformColumns(depTrans, keyColumns);
              String depKeyCondition = generateKeySubQuery(objectAttrs, baseAttrColTypes, depKeyColumns, true);
              depKeyCondition += ";";
              depTransQuery += depKeyCondition;
              System.out.println("[dependent transform] db=" + transDb + " - query=" + depTransQuery);
              // Statement depDBStmt = DbConnector.getStmtByDbName(depTransDb, true);
              rs = DbConnector.getQueryResultIterator(baseStmt, depTransQuery);
              rowCount = 0;
              isNullTransform = depTrans.getTransformFunc().equals("");
              numColumn = rs.getMetaData().getColumnCount();
              while (rs.next()) {
                rowCount++;
                ArrayList<String> preTransformRow = new ArrayList<>();

                for (int i=1; i <= numColumn; i++) {
                  System.out.println("[UpdateRequestHandler] transform attr: " + i + " has value: " + rs.getString(i));
                  preTransformRow.add(rs.getString(i) == null ? "" : rs.getString(i));
                }

                long depLvlTime = System.currentTimeMillis();
                ArrayList<String> transformedRow = isNullTransform ? preTransformRow : getTransformedRow(depCanvas, preTransformRow, engine, transformFuncId);
                double depLvlDiff = System.currentTimeMillis() - depLvlTime;
                double depLvlSec = depLvlDiff / 1000.0;
                System.out.println("higher level transform took: " + depLvlDiff + " ms and took: " + depLvlSec + " sec");
                System.out.println();
                System.out.println("[UpdateRequestHandler] running dependent transform for row: " + rowCount + " has values: " + transformedRow);
                System.out.println("[UpdateRequestHandler] and column names are: " + depTrans.getColumnNames());
                assert(transformedRow.size() == trans.getColumnNames().size());
                HashMap<String,String> depTransformColMap = zipLists(depTrans.getColumnNames(), transformedRow);
                String depTransUpdateQuery = createUpdateQuery(depTableName, depTransformColMap, attrColumnTypes, depKeyColumns, false);

                System.out.println();
                System.out.println("[UpdateRequestHandler] re-run dependent transform query: " + depTransUpdateQuery);
                depLvlTime = System.currentTimeMillis();
                stmt.executeUpdate(depTransUpdateQuery);
                depLvlDiff = System.currentTimeMillis() - depLvlTime;
                depLvlSec = depLvlDiff / 1000.0;
                System.out.println("higher level kyrix index update query took: " + depLvlDiff + " ms and took: " + depLvlSec + " sec");
                System.out.println();
              }
              transformFuncId++;
            }

            double timeDiff = System.currentTimeMillis() - currTime;
            double timeSec = timeDiff / 1000.0;
            System.out.println("Update took: " + timeDiff + " ms and took: " + timeSec + " sec");
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
        assert(dep.size() == 2);
        String depLayerId = dep.get(0);
        String depCanvasId = dep.get(1);

        System.out.println("initializing nashorn func with layerId: " + depLayerId + " and canvasId: " + depCanvasId);
        
        // TODO?: recurse through dependent transforms to propagate changes to current tranform
        // this only handles having one level of dependency...
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

    protected static NashornScriptEngine setupNashorn(ArrayList<String> transformFuncs) throws ScriptException {

      NashornScriptEngine engine =
              (NashornScriptEngine) new ScriptEngineManager().getEngineByName("nashorn");
      System.out.println("creating d3 folder in: " + Config.d3Dir);
      FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
      Require.enable(engine, rootFolder);

      // register the data transform function with nashorn
      String script =
              "var d3 = require('d3');\n"; // TODO: let users specify all required d3 libraries.
      
      String transformStrings = "";
      int count = 0;
      for (String transformFuncStr : transformFuncs) {
        transformStrings += "var trans" + String.valueOf(count) + " = " + transformFuncStr + ";\n";
        count++;
      }
      script += transformStrings;

      engine.eval(script);

      // get rendering parameters
      engine.put("renderingParams", Main.getProject().getRenderingParams());

      return engine;
    }

    // run the transformed function on a row to get a transformed row
    protected static ArrayList<String> getTransformedRow(
            Canvas c, ArrayList<String> row, NashornScriptEngine engine, int funcIdx)
            throws ScriptException, NoSuchMethodException {

        String funcName = "trans" + String.valueOf(funcIdx);
        // TODO: figure out why row.slice does not work. learn more about nashorn types
        ArrayList<String> transRow = new ArrayList<>();
        JSObject renderingParamsObj = (JSObject) engine.eval("JSON.parse(renderingParams)");
        String[] strArray =
                (String[])
                        engine.invokeFunction(funcName, row, c.getW(), c.getH(), renderingParamsObj);
        for (int i = 0; i < strArray.length; i++) transRow.add(strArray[i]);

        return transRow;
    }


    private byte[] readBody(HttpExchange httpExchange) throws IOException {
        InputStream in = httpExchange.getRequestBody();
        String length = httpExchange.getRequestHeaders().getFirst("content-length");
        if (length != null && !length.equals("0")) {
            byte[] buffer = new byte[Integer.parseInt(length)];
            in.read(buffer);
            in.close();
            return buffer;
        } else {
            ByteArrayOutputStream out = new ByteArrayOutputStream(1024);
            byte[] buffer = new byte[1024];
            int len = 0;
            while ((len = in.read(buffer)) != -1) {
                out.write(buffer, 0, len);
            }
            in.close();
            return out.toByteArray();
        }
    }

}