package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import org.apache.commons.io.output.ByteArrayOutputStream;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.List;
import java.util.Set;

import javax.net.ssl.HttpsURLConnection;
import main.Config;
import main.DbConnector;
import main.Main;

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
            List<String> keyColumns;
            String baseTable;
            String projName;

            // should be a POST request
            if (!httpExchange.getRequestMethod().equalsIgnoreCase("POST")) {
                Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
                return;
            }

            // get body data of POST request
            String body = new String(readBody(httpExchange), "utf-8");

            HashMap<String, String> map = new HashMap<String, String>();
            JSONObject jObject = new JSONObject(body);
            Iterator<?> keys = jObject.keys();
            while( keys.hasNext() ){
                String key = (String)keys.next();
                String value = jObject.getString(key); 
                map.put(key, value);
            }

            canvasId = map.get("canvasId").toString();
            layerId = map.get("layerId").toString();
            keyColumns = map.get("primaryKeyColumn").toString();
            baseTable = map.get("baseTable").toString();
            projName = map.get("projectName").toString();
            System.out.println("proj name is: " + projName);
            System.out.println("base table name is: " + baseTable);
            System.out.println("canvas id is: " + canvasId);
            System.out.println("layer id is: " + layerId);
            System.out.println("key column is: " + keyColumn);
            String rawAttributes = map.get("objectAttributes").toString();
            System.out.println("attributes string ->" + rawAttributes);
            HashMap<String, String> objectAttrs = new HashMap<String, String>();
            JSONObject attrJson = new JSONObject(rawAttributes);
            Iterator<?> attrKeys = attrJson.keys();
            while ( attrKeys.hasNext() ) {
                String key = (String)attrKeys.next();
                String value = attrJson.getString(key);
                objectAttrs.put(key, value);
            }
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
                if (attrNames.contains(colName)) {
                    attrColumnTypes.put(colName, colType);
                }
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
              if (attrNames.contains(colName)) {
                baseAttrColTypes.put(colName, colType);
              }
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
            baseRestQuery += " FROM (values " + baseValuesSubQuery + " )";
            baseRestQuery += " AS " + baseColumnSubQuery;
            baseRestQuery += " WHERE t.";

            String keyColumnType = attrColumnTypes.get(keyColumn);
            switch (keyColumnType) {
                case "double precision":
                    restQuery += keyColumn + "=" + objectAttrs.get(keyColumn);
                    break;
                case "text":
                    restQuery += keyColumn + "='" + objectAttrs.get(keyColumn) + "'";  
                    break;
                default:
                    // default is same as text column, most common
                    restQuery += keyColumn + "='" + objectAttrs.get(keyColumn) + "'";  
                    break;
            }
            String baseKeyColType = baseAttrColTypes.get(keyColumn);
            switch (baseKeyColType) {
              case "integer":
                baseRestQuery += keyColumn + "=" + objectAttrs.get(keyColumn);
                break;
              case "text":
                baseRestQuery += keyColumn += "='" + objectAttrs.get(keyColumn) + "'";
                break;
              default:
                baseRestQuery += keyColumn += "='" + objectAttrs.get(keyColumn) + "'";
                break;
            }
            restQuery += ";";
            updateQuery += restQuery;
            baseRestQuery += ";";
            baseUpdateQuery += baseRestQuery;
            // baseUpdateQuery += restQuery;
            System.out.println("Kyrix Index Update Query: " + updateQuery);
            stmt.executeUpdate(updateQuery);
            stmt.close();
            System.out.println("Base table update query: " + baseUpdateQuery);
            baseStmt.executeUpdate(baseUpdateQuery);
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