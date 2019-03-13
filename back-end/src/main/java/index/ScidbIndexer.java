package index;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;
import project.Project;

import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.net.*;
import java.io.*;
import java.util.Arrays;

public class ScidbIndexer extends Indexer{

    private static ScidbIndexer instance = null;

    // singleton pattern to ensure only one instance existed
    private ScidbIndexer() {}

    public static synchronized ScidbIndexer getInstance() {

        if (instance == null)
            instance = new ScidbIndexer();
        return instance;
    }

    private static String sessionId;
    private static int tilesize = 500;

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        sessionId = Main.getSessionId();

        Layer l = c.getLayers().get(layerId);
        Transform trans = l.getTransform();

        if (c.getId().equals("type"))
            return;

        // if this is an empty layer, return
        if (trans.getDb().equals(""))
            return ;

        //step0: create a in memory array
        String arrayName = Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;
        int arrayW = c.getW()/tilesize - 1;
        int arrayH = c.getH()/tilesize - 1;
        //remove array if existed
        getScidbRes("remove("+arrayName + ")");
        System.out.println("remove("+arrayName + ")");
        //create array and schema
        String arraySchema;
        if (c.getId().equals("name")){
            arraySchema = " <val:string>[r=0:"+arrayH +":0:2; c=0:" + arrayW + ":0:300000]";
        }
        else {
            arraySchema = " <val:string>[id=0:6999; r=0:"+arrayH +":0:2; c=0:" + arrayW + ":0:300000]";
        }
        String createArray = "CREATE ARRAY " + arrayName + arraySchema;
        String stat = URLEncoder.encode(createArray, "UTF-8");
        System.out.println(createArray);
        getScidbRes(stat);

        // step 1: set up nashorn environment
        NashornScriptEngine engine = null;
        if (! trans.getTransformFunc().equals(""))
            engine = setupNashorn(trans.getTransformFunc());

        // step 2: looping through query results
        // TODO: distinguish between separable and non-separable cases
        Statement rawDBStmt = DbConnector.getStmtByDbName(trans.getDb());
        ResultSet rs = DbConnector.getQueryResultIterator(rawDBStmt, trans.getQuery());
        int numColumn = rs.getMetaData().getColumnCount();
        int rowCount = 0;

        ArrayList<ArrayList<StringBuilder>> kyrixName = new ArrayList<>();
        ArrayList<ArrayList<ArrayList<StringBuilder>>> kyrix = new ArrayList<>();
        if (c.getId().equals("name")) {
            for (int i = 0; i < arrayH+1; i ++){
                ArrayList<StringBuilder> temp = new ArrayList<>();
                for (int j = 0; j < arrayW+1; j++)
                    temp.add(new StringBuilder("|"));
                kyrixName.add(temp);
            }
        }
        else {
            for (int k = 0; k < 7000; k ++){
                ArrayList<ArrayList<StringBuilder>> phenotype = new ArrayList<>();
                for (int i = 0; i < arrayH+1; i ++){
                    ArrayList<StringBuilder> temp = new ArrayList<>();
                    for (int j = 0; j < arrayW+1; j++)
                        temp.add(new StringBuilder("|"));
                    phenotype.add(temp);
                }
                kyrix.add(phenotype);
            }
        }
        int maxl = 0;

        while (rs.next()) {
            StringBuilder bboxInsSqlBuilder = new StringBuilder();
            // count log
            rowCount++;
            if (rowCount % 1000000 == 0)
                System.out.println(rowCount);

            // get raw row
            ArrayList<String> curRawRow = new ArrayList<>();
            for (int i = 1; i <= numColumn; i++)
                curRawRow.add(rs.getString(i));

            // step 3: run transform function on this tuple
            ArrayList<String> transformedRow;
            if (!trans.getTransformFunc().equals(""))
                transformedRow = getTransformedRow(c, curRawRow, engine);
            else
                transformedRow = curRawRow;

            // step 4: calculate bounding boxes
            ArrayList<Double> curBbox = getBboxCoordinates(c, l, transformedRow);

            // insert into bbox table
            for (int i = 0; i < transformedRow.size(); i++)
                bboxInsSqlBuilder.append(transformedRow.get(i).replaceAll(",", ".") + "+");
            for (int i = 0; i < 5; i++)
                bboxInsSqlBuilder.append(String.valueOf(curBbox.get(i)) + "+");
            bboxInsSqlBuilder.append(String.valueOf(curBbox.get(5)));
            bboxInsSqlBuilder.append("|");

            double minx, miny, maxx, maxy;
            minx = curBbox.get(2);
            miny = curBbox.get(3);
            maxx = curBbox.get(4);
            maxy = curBbox.get(5);

            int startx, starty, endx, endy;
            startx = (int) (minx / tilesize);
            starty = (int) (miny / tilesize);
            endx = (int) (maxx / tilesize);
            endy = (int) (maxy / tilesize);

            for (int m = startx; m <= endx; m++)
                for (int n = starty; n <= endy; n++) {
                    if (c.getId().equals("name")) {
                        kyrixName.get(n).get(m).append(bboxInsSqlBuilder);
                    } else {
                        int typeId = Integer.valueOf(transformedRow.get(2));
                        kyrix.get(typeId).get(n).get(m).append(bboxInsSqlBuilder);
                    }
                }

        }
        rs.close();

        //write the array into a file
        PrintWriter out = new PrintWriter("filename.txt");
        if (c.getId().equals("name")){
            out.println(Arrays.toString(kyrixName.toArray()));
        }
        else{
            out.println(Arrays.toString(kyrix.toArray()));
        }
        out.close();

        //load the array into scidb
        stat = URLEncoder.encode("store(input(" + arraySchema + ",'/home/ubuntu/Kyrix/back-end/filename.txt'),"+ arrayName + ")");
        getScidbRes(stat);
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(Canvas c, int layerId, String regionWKT, String predicate)
            throws Exception {

        Project project = Main.getProject();
      //  String tmp = regionWKT.replaceAll("[\\D]", " ");
        String[] coor = regionWKT.split(",");

        int minx = Integer.parseInt(coor[1].split(" ")[1]);
        int miny = Integer.parseInt(coor[3].split(" ")[2]);
        int maxx = Integer.parseInt(coor[3].split(" ")[1]);
        int maxy = Integer.parseInt(coor[1].split(" ")[2]);

        int idminx = (int)(minx/tilesize) > 0 ? (int)(minx/tilesize) : 0;
        int idminy = (int)(miny/tilesize) > 0 ? (int)(miny/tilesize) : 0;
        int idmaxx = (int)(maxx/tilesize);
        int idmaxy = (int)(maxy/tilesize);
        minx = minx > 0 ? minx : 0;

        String query;
        ArrayList<ArrayList<String>> result = new ArrayList<>();
        if (predicate.length() > 0) {
            //parse predicate
            String preds = predicate.split("'")[1];

            if (c.getId().equals("type")) {
                int pred = (int)(Double.parseDouble(preds)/tilesize);
                System.out.println(pred);
                query = "between("+ project.getName()+"_"+"dotslayer"+layerId+","+minx+","+idminy+","+pred+","+maxx+","+idmaxy+"," + pred+")";
            }else{
                query = "between("+ project.getName()+"_"+c.getId()+"layer"+layerId+","+preds+","+idminy+","+idminx+","+preds+","+idmaxy+","+idmaxx+")";}
        }else{
            query = "between("+ project.getName()+"_"+c.getId()+"layer"+layerId+","+idminy+","+idminx+","+idmaxy+","+idmaxx+")";
        }
        System.out.println("fetching: " + query);
        String sessionId = Main.getSessionId();
        String current;
        String res = "";
        try{
            URL url = new URL("http://localhost:8080/execute_query?id="+sessionId+"&query="+query+"&save=dcsv");
            URLConnection conn = url.openConnection();
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            while((current = in.readLine()) != null);
            url = new URL("http://localhost:8080/read_lines?id=" + sessionId + "&n=0");
            conn = url.openConnection();
            in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            current = in.readLine();
            while((current = in.readLine()) != null) {
                for (String row: current.split("\\|")){
                    if (row.contains("}") || row.contains("'"))
                        continue;
                    ArrayList<String> curRow = new ArrayList<>();
                    for (String val: row.split("\\+"))
                        curRow.add(val);
                    result.add(curRow);
                }
            }
        }catch(IOException e){
            e.printStackTrace();
        }

        return result;
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromTile(Canvas c, int layerId, int minx, int miny, String predicate)
            throws Exception {
//not completed
        // get column list string
        String colListStr = c.getLayers().get(layerId).getTransform().getColStr("");

        // construct range query
        String sql = "select " + colListStr + " from bbox_" + Main.getProject().getName() + "_"
                + c.getId() + "layer" + layerId + " where ";
        sql += "st_intersects(st_GeomFromText('Polygon((" + minx + " " + miny + "," + (minx + Config.tileW) + " " + miny;
        sql += "," + (minx + Config.tileW) + " " + (miny + Config.tileH) + "," + minx + " " + (miny + Config.tileH)
                + "," + minx + " " + miny + "))'),geom)";
        if (predicate.length() > 0)
            sql += " and " + predicate + ";";
        System.out.println(minx + " " + miny + " : " + sql);

        // return
        return DbConnector.getQueryResult(Config.databaseName, sql);
    }

    public static String getScidbRes(String u){
        try{
            String host = "http://localhost:8080/execute_query?id=" + sessionId;
            URL url = new URL(host + "&query=" + u);
            URLConnection conn = url.openConnection();
            conn.setDoOutput(true);
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String urlString = "";
            String current;
            while((current = in.readLine()) != null){
                urlString += current;
            }
            System.out.println(urlString);
            return urlString;
        }catch(IOException e){
            e.printStackTrace();
        }
        return "";
    }

}
