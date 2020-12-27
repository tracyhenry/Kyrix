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

            // HashMap<String, String> map = new HashMap<String, String>();
            // JSONObject jObject = new JSONObject(body);
            // Iterator<?> keys = jObject.keys();
            // while( keys.hasNext() ){
            //     String key = (String)keys.next();
            //     String value = jObject.getString(key); 
            //     map.put(key, value);
            // }

            // canvasId = map.get("canvasId").toString();
            // layerId = map.get("layerId").toString();
            // keyColumns = map.get("primaryKeyColumn").toString();
            // baseTable = map.get("baseTable").toString();
            // projName = map.get("projectName").toString();
            canvasId = updateRequest.getCanvasId();
            layerId = updateRequest.getLayerId();
            keyColumns = updateRequest.getKeyColumns();
            objectAttrs = updateRequest.getObjectAttributes();
            baseTable = updateRequest.getBaseTable();
            projName = updateRequest.getProjectName();
             // String rawAttributes = map.get("objectAttributes").toString();

            // System.out.println("attributes string ->" + rawAttributes);
            // HashMap<String, String> objectAttrs = new HashMap<String, String>();
            // JSONObject attrJson = new JSONObject(rawAttributes);
            // Iterator<?> attrKeys = attrJson.keys();
            // while ( attrKeys.hasNext() ) {
            //     String key = (String)attrKeys.next();
            //     String value = attrJson.getString(key);
            //     objectAttrs.put(key, value);
            // }
            System.out.println("object attrs: " + objectAttrs);

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

            String updateQuery = 
                "UPDATE " + tableName + " as t SET ";
            String baseUpdateQuery = "UPDATE " + baseTable + " as t SET "; 
            String restQuery = "";
            String baseRestQuery = "";
            String valuesSubQuery = "(";
            String baseValuesSubQuery = "(";
            String columnSubQuery = "c(";
            String baseColumnSubQuery = "c(";
            String keyCondition = "";
            Iterator<String> attrNameIterator = attrNames.iterator();
            while (attrNameIterator.hasNext()) {
                colName = attrNameIterator.next();
                colType = attrColumnTypes.get(colName);
                baseColType = baseAttrColTypes.get(colName);
                restQuery += colName + "=" + "c." + colName;
                baseRestQuery += colName + "=" + "c." + colName;

                columnSubQuery += colName;
                baseColumnSubQuery += colName;
                switch (colType) {
                  case "double precision":
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
                switch (baseColType) {
                  case "integer":
                    baseValuesSubQuery += objectAttrs.get(colName);
                    break;
                  case "text":
                    baseValuesSubQuery += "'" + objectAttrs.get(colName) + "'";
                    break;
                  default:
                    valuesSubQuery += "'" + objectAttrs.get(colName) + "'";  
                    break;
                }
                if (attrNameIterator.hasNext()) {
                    restQuery += ", ";
                    baseRestQuery += ", ";
                    columnSubQuery += ", ";
                    baseColumnSubQuery += ", ";
                    valuesSubQuery += ", ";
                    baseValuesSubQuery += ", ";
                }
            }
            valuesSubQuery += ")";
            columnSubQuery += ")";
            baseValuesSubQuery += ")";
            baseColumnSubQuery += ")";
            // add subqueries to update query
            restQuery += " FROM (values " + valuesSubQuery + " )";
            restQuery += " AS " + columnSubQuery; 
            restQuery += " WHERE t.";
            keyCondition += " WHERE ";
            baseRestQuery += " FROM (values " + baseValuesSubQuery + " )";
            baseRestQuery += " AS " + baseColumnSubQuery;
            baseRestQuery += " WHERE t.";

            int i = 0;
            for (String key : keyColumns) {
              String keyColumnType = attrColumnTypes.get(key);
              switch (keyColumnType) {
                  case "double precision":
                      restQuery += key + "=" + objectAttrs.get(key);
                      break;
                  case "text":
                      restQuery += key + "='" + objectAttrs.get(key) + "'";  
                      break;
                  default:
                      // default is same as text column, most common
                      restQuery += key + "='" + objectAttrs.get(key) + "'";  
                      break;
              }
              String baseKeyColType = baseAttrColTypes.get(key);
              switch (baseKeyColType) {
                case "integer":
                  baseRestQuery += key + "=" + objectAttrs.get(key);
                  keyCondition += key + "=" + objectAttrs.get(key);
                  break;
                case "text":
                  baseRestQuery += key + "='" + objectAttrs.get(key) + "'";
                  keyCondition += key + "='" + objectAttrs.get(key) + "'";
                  break;
                default:
                  baseRestQuery += key + "='" + objectAttrs.get(key) + "'";
                  keyCondition += key + "='" + objectAttrs.get(key) + "'";
                  break;
              }

              if (i < (keyColumns.size() - 1)) {
                restQuery += " AND t.";
                baseRestQuery += " AND t.";
                keyCondition += " AND ";
              }
              i++;
            }
            
            restQuery += ";";
            updateQuery += restQuery;
            baseRestQuery += ";";
            baseUpdateQuery += baseRestQuery;
            // baseUpdateQuery += restQuery;
            System.out.println("Kyrix Index Update Query: " + updateQuery);
            stmt.executeUpdate(updateQuery);
            // stmt.close();
            System.out.println("Base table update query: " + baseUpdateQuery);
            baseStmt.executeUpdate(baseUpdateQuery);
            baseStmt.close();

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
            NashornScriptEngine engine = null;
            if (!trans.getTransformFunc().equals("")) engine = setupNashorn(trans.getTransformFunc());

            String transDb = projName;
            String baseTransQuery = trans.getQuery();
            baseTransQuery = baseTransQuery.replaceAll(";", "");
            keyCondition += ";";
            baseTransQuery += keyCondition;
            System.out.println("db=" + transDb + " - query=" + baseTransQuery);
            Statement rawDBStmt = DbConnector.getStmtByDbName(transDb, true);
            rs = DbConnector.getQueryResultIterator(rawDBStmt, baseTransQuery);
            int rowCount = 0;
            boolean isNullTransform = trans.getTransformFunc().equals("");
            int numColumn = rs.getMetaData().getColumnCount();




            while (rs.next()) {

              // count log - important to increment early so modulo-zero doesn't trigger on first
              // iteration
              rowCount++;
  
              // get raw row
              ArrayList<String> curRawRow = new ArrayList<>();
              for (i = 1; i <= numColumn; i++)
                  curRawRow.add(rs.getString(i) == null ? "" : rs.getString(i));
  
              // step 3: run transform function on this tuple
              ArrayList<String> transformedRow =
                      isNullTransform ? curRawRow : getTransformedRow(c, curRawRow, engine);

              System.out.println("[UpdateRequestHandler] re-running transform, row: "
                                   + rowCount + " has values: " + transformedRow);
              System.out.println("[UpdateRequestHandler] column names are: " + trans.getColumnNames());


              updateQuery = 
                "UPDATE " + tableName + " as t SET ";
              restQuery = "";
              valuesSubQuery = "(";
              columnSubQuery = "c(";
              keyCondition = "";
              assert(transformedRow.size() == trans.getColumnNames().size());
              Iterator<String> colIterator = trans.getColumnNames().iterator();
              int colNum = 0;
              while (colIterator.hasNext()) {
                  colName = colIterator.next();
                  System.out.println();
                  System.out.println("[re-run tranform] col name-> " + colName);
                  colType = attrColumnTypes.get(colName);
                  System.out.println("[re-run tranform] col type-> " + colType);
                  restQuery += colName + "=" + "c." + colName;
                  String colValue = transformedRow.get(colNum);

                  columnSubQuery += colName;
                  switch (colType) {
                    case "double precision":
                        valuesSubQuery += colValue;
                        break;
                    case "text":
                        valuesSubQuery += "'" + colValue + "'";  
                        break;
                    default:
                        // default is same as text column, most common
                        valuesSubQuery += "'" + colValue + "'";  
                        break;
                  }
                  if (colIterator.hasNext()) {
                      restQuery += ", ";
                      columnSubQuery += ", ";
                      valuesSubQuery += ", ";
                  }
                  colNum++;
              }
              valuesSubQuery += ")";
              columnSubQuery += ")";
              // add subqueries to update query
              restQuery += " FROM (values " + valuesSubQuery + " )";
              restQuery += " AS " + columnSubQuery; 
              restQuery += " WHERE t.";

              i = 0;
              for (String key : keyColumns) {
                String keyColumnType = attrColumnTypes.get(key);
                switch (keyColumnType) {
                    case "double precision":
                        restQuery += key + "=" + objectAttrs.get(key);
                        break;
                    case "text":
                        restQuery += key + "='" + objectAttrs.get(key) + "'";  
                        break;
                    default:
                        // default is same as text column, most common
                        restQuery += key + "='" + objectAttrs.get(key) + "'";  
                        break;
                }

                if (i < (keyColumns.size() - 1)) {
                  restQuery += " AND t.";
                }
                i++;
              }
              
              restQuery += ";";
              updateQuery += restQuery;
              System.out.println();
              System.out.println("[UpdateRequestHandler] re-run transform query: " +  updateQuery);
              stmt.executeUpdate(updateQuery);
            }
            


            Map<String, Object> respMap = new HashMap<>();
            response = gson.toJson(respMap);
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("\n\n" + e.getMessage() + "\n");
            Server.printServingErrorMessage();
        }
    }

    protected static NashornScriptEngine setupNashorn(String transformFunc) throws ScriptException {

      NashornScriptEngine engine =
              (NashornScriptEngine) new ScriptEngineManager().getEngineByName("nashorn");
      FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
      Require.enable(engine, rootFolder);

      // register the data transform function with nashorn
      String script =
              "var d3 = require('d3');\n"; // TODO: let users specify all required d3 libraries.
      script += "var trans = " + transformFunc + ";\n";
      engine.eval(script);

      // get rendering parameters
      engine.put("renderingParams", Main.getProject().getRenderingParams());

      return engine;
    }

    // run the transformed function on a row to get a transformed row
    protected static ArrayList<String> getTransformedRow(
            Canvas c, ArrayList<String> row, NashornScriptEngine engine)
            throws ScriptException, NoSuchMethodException {

        // TODO: figure out why row.slice does not work. learn more about nashorn types
        ArrayList<String> transRow = new ArrayList<>();
        JSObject renderingParamsObj = (JSObject) engine.eval("JSON.parse(renderingParams)");
        String[] strArray =
                (String[])
                        engine.invokeFunction("trans", row, c.getW(), c.getH(), renderingParamsObj);
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