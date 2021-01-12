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

    private String generateKeySubQuery(HashMap<String,Object> objectAttrs, HashMap<String,String> attrColumnTypes, ArrayList<String> keyColumns, boolean isTransformQuery) {
      String keyCondition;
      if (isTransformQuery) {
        keyCondition = " WHERE ";
      } else {
        keyCondition = " WHERE t.";
      }

      int i = 0;
      for (String key : keyColumns) {
        String keyColumnType = attrColumnTypes.get(key);
        String keyColumnValue = objectAttrs.get(key).toString();
        switch (keyColumnType) {
            case "double precision":
                keyCondition += key + "=" + keyColumnValue;
                break;
            case "integer":
                keyCondition += key + "=" + keyColumnValue;
                break;
            case "text":
                keyCondition += key + "='" + keyColumnValue + "'";  
                break;
            default:
                // default is same as text column, most common
                keyCondition += key + "='" + keyColumnValue + "'";  
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

    private String createUpdateQuery(String tableName,  HashMap<String, Object> objectAttrs, HashMap<String, String> attrColumnTypes, ArrayList<String> keyColumns, boolean isTransform) {
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
          String colValue = objectAttrs.get(colName).toString();


          columnSubQuery += colName;
          switch (colType) {
            case "double precision":
                valuesSubQuery += colValue;
                break;
            case "integer":
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
            HashMap<String, Object> objectAttrs;
            String baseTable;
            String projName;
            boolean isSSV;
            int ssvLevel;

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
            int layerIdNum = Integer.valueOf(layerId);
            keyColumns = updateRequest.getKeyColumns();
            objectAttrs = updateRequest.getObjectAttributes();
            baseTable = updateRequest.getBaseTable();
            projName = updateRequest.getProjectName();
            isSSV = updateRequest.isSSV();
            ssvLevel = updateRequest.getSSVLevel();

            long startTime = System.currentTimeMillis();
            System.out.println("object attrs: " + objectAttrs);

            long currTime = System.currentTimeMillis();
            // String tableName = "bbox_" + Main.getProject().getName()
                                    //  + "_" + canvasId + "layer" + layerId;
            String tableName;
            if (isSSV) {
              tableName = "bbox_" + Main.getProject().getName()
                            +  "_" + canvasId + "layer" + layerId;
            } else {
              // For reference: bbox_ssv_circle_ssv0_level1layer0 where project name = 'ssv_circle'
              tableName = "bbox_" + Main.getProject().getName() + "_ssv0_" 
                            + "level" + ssvLevel + "layer" + layerId; 
            }
            
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
            // HashMap<String, String> baseAttrColTypes = new HashMap<String, String>();
            // Statement baseStmt = DbConnector.getStmtByDbName(projName);
            // typeQuery = 
            //       "SELECT column_name, data_type  FROM information_schema.columns WHERE table_name = "
            //         + "'" + baseTable + "';";
            // ResultSet baseRs = baseStmt.executeQuery(typeQuery);
            // while (baseRs.next()) {
            //   colName = baseRs.getString(1);
            //   colType = baseRs.getString(2);
            //   System.out.println("[base] colName, colType -> " + colName + ", " + colType);
            //   // if (attrNames.contains(colName)) {
            //     baseAttrColTypes.put(colName, colType);
            //   // }
            // }
            // System.out.println("base column types -> " + baseAttrColTypes);

            String curSSVId = Main.getProject().getCanvas(canvasId).getLayers().get(layerIdNum).getSSVId();
            int ssvIndex = Integer.valueOf(curSSVId.substring(0, curSSVId.indexOf("_")));

            SSV ssv = Main.getProject().getSsvs().get(ssvIndex);
            String xColName = ssv.getxCol();
            String yColName = ssv.getyCol();
            double v_x = Double.valueOf(objectAttrs.get(xColName).toString());
            double v_y = Double.valueOf(objectAttrs.get(yColName).toString());
            int numLevels = ssv.getNumLevels();

            System.out.println("hierarchically updating ssv with: " + numLevels 
                                + " levels, x col: " + xColName + " with value: " + v_x
                                + " and y col: " + yColName + " with value: " + v_y);

           
            for (int i=0; i < numLevels; i++) {
              tableName = "bbox_" + Main.getProject().getName() + "_ssv0_" 
                            + "level" + i + "layer" + layerId; 

              // copy object attrs into a new object and change cx,cy,minx,miny,maxx,maxy attributes
              // based on level
              HashMap<String, Object> levelObjectAttrs = new HashMap<String, Object>();
              for (String key : objectAttrs.keySet()) {
                levelObjectAttrs.put(key, objectAttrs.get(key));
              }
              // calculate cx values
              double cx = ssv.getCanvasCoordinate(i, v_x, true);
              double cy = ssv.getCanvasCoordinate(i, v_y, false);
              double minx = cx - (ssv.getBboxW() / 2.0);
              double maxx = cx + (ssv.getBboxW() / 2.0);
              double miny = cy - (ssv.getBboxH() / 2.0);
              double maxy = cy + (ssv.getBboxH() / 2.0);
              levelObjectAttrs.put("cx", Double.toString(cx));
              levelObjectAttrs.put("cy", Double.toString(cy));
              levelObjectAttrs.put("minx", Double.toString(minx));
              levelObjectAttrs.put("maxx", Double.toString(maxx));
              levelObjectAttrs.put("miny", Double.toString(miny));
              levelObjectAttrs.put("maxy", Double.toString(maxy));

              String updateQuery = createUpdateQuery(tableName, levelObjectAttrs, attrColumnTypes, keyColumns, false);
              // String baseUpdateQuery = createUpdateQuery(baseTable, objectAttrs, baseAttrColTypes, keyColumns, false);

              
              // baseUpdateQuery += restQuery;
              System.out.println("Kyrix Index Update Query for level " + i +  "is : " + updateQuery);
              stmt.executeUpdate(updateQuery);
              // stmt.close();
              // System.out.println("Base table update query: " + baseUpdateQuery);
              // baseStmt.executeUpdate(baseUpdateQuery);
            }
            

            double midTime = System.currentTimeMillis() - startTime;
            double midTimeSec = midTime / 1000.0;
            System.out.println("updating up to re-running transform took: " + midTimeSec + " sec.");


            double timeDiff = System.currentTimeMillis() - currTime;
            double timeSec = timeDiff / 1000.0;
            System.out.println("Update took: " + timeDiff + " ms and took: " + timeSec + " sec");
            stmt.close();
            // baseStmt.close();
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