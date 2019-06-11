package index;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;
import project.Project;

import java.util.ArrayList;
import org.rosuda.REngine.Rserve.RConnection;
import org.rosuda.REngine.REXP;
import org.rosuda.REngine.RList;
import java.lang.Integer;
import java.lang.Long;
import java.lang.Double;

public class ScidbIndexer extends Indexer {

    private static ScidbIndexer instance = null;
    private RConnection rc;
    private ScidbIndexer() {}
    private int chromo = 0;

    public static synchronized ScidbIndexer getInstance() {

        if (instance == null)
            instance = new ScidbIndexer();
        return instance;
    }
    @Override
    public void createMV(Canvas c, int layerId) throws Exception {
        System.out.println("no precomputation for scidb, get scidb connector");

    }
    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(Canvas c, int layerId, String regionWKT, String predicate)
            throws Exception {
            long[] chromosome_lengths = new long[] {
    249250621,
    243199373,
    198022430,
    191154276,
    180915260,
    171115067,
    159138663,
    146364022,
    141213431,
    135534747,
    135006516,
    133851895,
    115169878,
    107349540,
    102531392,
    90354753,
    81195210,
    78077248,
    59128983,
    63025520,
    48129895,
    51304566,
    155270560,
    59373566
  };
        String[] coor = regionWKT.split(",");
        int firstx = Integer.parseInt(coor[1].split(" ")[1]);
        int secondx = Integer.parseInt(coor[2].split(" ")[1]);
        int thirdx = Integer.parseInt(coor[3].split(" ")[1]);
        int minx = Math.min(thirdx, Math.min(firstx, secondx));
        int maxx = Math.max(thirdx, Math.max(firstx, secondx));
        if(minx <=0)
            minx = 0;
        long zoomLevel = 250;
System.out.println("predicate: " + predicate);
        if(predicate.length() > 0){
            String[] preds = predicate.split("\'");
            chromo = (int)(Double.parseDouble(preds[1]));
System.out.println("minx "+minx+" maxx " +maxx);
        }
        String start = Long.toString(minx * zoomLevel);
        String end = Long.toString(maxx * zoomLevel);
System.out.println(" start " + start + " end " + end);

        String filePath = "/home/scidb/biobank/phege/lib/data_access_helpers.R";
        RConnection rc = new RConnection();
        rc.assign("filepath", filePath);
        rc.eval("source(filepath)");
        rc.eval("namespace <- \"RIVAS\"");
        rc.eval("association_set = \"RIVAS_ASSOC\"");
        rc.eval("variants_namespace = \"UK_BIOBANK\"");
        rc.eval("bb <- get_scidb_biobank_connection(username = \"scidbadmin\", password = \"Paradigm4\")");
        rc.assign("chromosome", Integer.toString(chromo));
        rc.assign("start", start);
        rc.assign("end", end);
        rc.eval("phenotypes <- get_phenotypes(bb,association_namespace = namespace,association_set_name = association_set)");
        rc.eval("phenos <- phenotypes[as.integer(1), ]");
        rc.eval("sub_field_ids <- subset(phenotypes, title %in% phenos$title)$sub_field_id");
        rc.parseAndEval("REGION_TAB_ADDITIONAL_VARIANT_FIELD_NAME = c(\"genes\", \"consequence\")");
        REXP a = rc.parseAndEval("try(result <- get_associations_for_region_tab(bb, variants_namespace = variants_namespace, association_namespace = namespace, association_set_name = association_set, sub_field_ids = sub_field_ids, chromosome = chromosome, start_position = start, end_position = end, additional_variant_field_names = REGION_TAB_ADDITIONAL_VARIANT_FIELD_NAME), silent=TRUE)");
        if(a.inherits("try-error"))
              System.out.println("Error: "+ a.asString());
System.out.println("get result");
        rc.eval("result <- merge(result, phenotypes, by = \"sub_field_id\")");
        rc.eval("result <- result[order(result$pos), ]");
        rc.eval("result$title <- as.character(result$title)");
        rc.eval("result$sub_field_id <- NULL");
        rc.eval("result$pvalue_threshold <- NULL");
        rc.eval("result$xpos <- result$pos");
        RList x = rc.eval("result").asList();
        String[] keys = x.keys();
        ArrayList<ArrayList<String>> result = new ArrayList<>();
        double[] chrom = x.at(keys[0]).asDoubles();
            for(int i=0;i<chrom.length;i++){
                ArrayList<String> curRow = new ArrayList<>();
                for(String key : keys){
                    String[] s = x.at(key).asStrings();
                    curRow.add(s[i]);
                }
            result.add(curRow);
            }
        rc.close();

        return result;
}
    @Override
    public ArrayList<ArrayList<String>> getDataFromTile(Canvas c, int layerId, int minx, int miny, String predicate)
            throws Exception {
        ArrayList<ArrayList<String>> res = new ArrayList<>();
        res.add(new ArrayList<String>());
        return res;
}
}
