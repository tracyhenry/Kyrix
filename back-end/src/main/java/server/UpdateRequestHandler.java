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
            String keyColumn;

            long startTime = System.currentTimeMillis();

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
            keyColumn = map.get("primaryKeyColumn").toString();
            String projName = map.get("projectName").toString();
            System.out.println("canvas id is: " + canvasId);
            System.out.println("layer id is: " + layerId);
            System.out.println("key column is: " + keyColumn);
            System.out.println("project name is: " + projName);
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
            HashMap<String, String> attrColumnTypes = new HashMap<String, String>();
            Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
            String typeQuery = 
                    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = "
                    + "'" + tableName + "';";
            ResultSet rs = stmt.executeQuery(typeQuery);
            String colName;
            String colType;
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
            String updateQuery = 
                "UPDATE " + tableName + " as t SET "; 
            String valuesSubQuery = "(";
            String columnSubQuery = "c(";
            Iterator<String> attrNameIterator = attrNames.iterator();
            while (attrNameIterator.hasNext()) {
                colName = attrNameIterator.next();
                colType = attrColumnTypes.get(colName);
                updateQuery += colName + "=" + "c." + colName;
                columnSubQuery += colName;
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
                if (attrNameIterator.hasNext()) {
                    updateQuery += ", ";
                    columnSubQuery += ", ";
                    valuesSubQuery += ", ";
                }
            }
            valuesSubQuery += ")";
            columnSubQuery += ")";
            // add subqueries to update query
            updateQuery += " FROM (values " + valuesSubQuery + " )";
            updateQuery += " AS " + columnSubQuery; 
            updateQuery += " WHERE t.";
            String keyColumnType = attrColumnTypes.get(keyColumn);
            switch (keyColumnType) {
                case "double precision":
                    updateQuery += keyColumn+ "=" + objectAttrs.get(keyColumn);
                    break;
                case "text":
                    updateQuery += keyColumn + "='" + objectAttrs.get(keyColumn) + "'";  
                    break;
                default:
                    // default is same as text column, most common
                    updateQuery += keyColumn + "='" + objectAttrs.get(keyColumn) + "'";  
                    break;
            }
            updateQuery += ";";
            System.out.println("Update Query: " + updateQuery);
            stmt.executeUpdate(updateQuery);

            double updateTimeDiff = System.currentTimeMillis() - startTime;
            Server.sendStats(projName, canvasId, "update", updateTimeDiff, 1);
            System.out.println("[UpdateRequestHandler] update took: " + updateTimeDiff + " ms or " + (updateTimeDiff/1000) + " sec.");
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