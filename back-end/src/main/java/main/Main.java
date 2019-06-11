package main;

import cache.TileCache;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import index.Indexer;
import project.Project;
import server.Server;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.lang.*;

import org.rosuda.REngine.Rserve.RConnection;
import org.rosuda.REngine.REXP;
import org.rosuda.REngine.RList;


public class Main {

    private static Project project = null;
    public static String projectJSON = "";

    public static void main(String[] args) throws Exception {

        // for use in a Dockerfile, where we don't want to connect to the database
        if (args.length > 0 && args[0].equals("--immediate-shutdown")) {
            System.exit(0);
        }

        // read config file
        readConfigFile();

        // get project definition, create project object
        getProjectObject();

/*
        String filePath = "/home/scidb/biobank/phege/lib/data_access_helpers.R";
        RConnection rc = new RConnection();
        rc.assign("filepath", filePath);
        rc.eval("source(filepath)");
        rc.eval("namespace <- \"RIVAS\"");
        rc.eval("association_set = \"RIVAS_ASSOC\"");
        rc.eval("variants_namespace = \"UK_BIOBANK\"");
        rc.eval("bb <- get_scidb_biobank_connection(username = \"scidbadmin\", password = \"Paradigm4\")");
        rc.assign("chromosome", "1");
        rc.assign("start","11475435");
        rc.assign("end", "11575435");
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

*/




        // precompute if project object is not null and is dirty
        if (project == null) {
            System.out.println("No main project definition. Skipping reindexing...");
        } else {
            if (isProjectDirty()) {
                System.out.println("Main project (" + project.getName() + ") definition has been changed since last session, re-calculating indexes...");
                Indexer.precompute();
                System.out.println("Marking project (" + project.getName() + ") as clean...");
                setProjectClean();
            } else {
                Indexer.associateIndexer();
                System.out.println("Main project (" + project.getName() + ") definition has not been changed since last session. Skipping reindexing...");
            }
        }

        System.out.println("Creating tile cache...");
        TileCache.create();

        System.out.println("Starting server...");
        Server.startServer(Config.portNumber);
    }

    public static Project getProject() {
        return project;
    }

    public static void setProject(Project newProject) {

        project = newProject;
    }

    public static boolean isProjectDirty() throws SQLException, ClassNotFoundException {

        String sql = "select dirty from " + Config.projectTableName + " where name = \'" + Config.projectName + "\';";
        ArrayList<ArrayList<String>> ret = DbConnector.getQueryResult(Config.databaseName, sql);
        return (Integer.valueOf(ret.get(0).get(0)) == 1);
    }

    public static void setProjectClean() throws SQLException, ClassNotFoundException {

        String sql = "update " + Config.projectTableName + " set dirty = " + 0 + " where name = \'" + Config.projectName + "\';";
        DbConnector.executeUpdate(Config.databaseName, sql);
    }

    private static void readConfigFile() throws IOException {

        // read config file
        BufferedReader br = new BufferedReader(new FileReader(Config.configFileName));
        String line;
        List<String> inputStrings = new ArrayList<>();
        while ((line = br.readLine()) != null)
            inputStrings.add(line);

        Config.projectName = inputStrings.get(Config.projectNameRow);
        Config.portNumber = Integer.valueOf(inputStrings.get(Config.portNumberRow));
        String dbStr = inputStrings.get(Config.dbRow).toLowerCase();
        Config.database = (dbStr.equals("mysql") ? Config.Database.MYSQL : dbStr.equals("psql") ? Config.Database.PSQL : Config.Database.SCIDB);
        System.out.println("dbtype: " + dbStr + "  Config.database=" + Config.database);
        Config.dbServer = inputStrings.get(Config.dbServerRow);
        Config.userName = inputStrings.get(Config.userNameRow);
        Config.password = inputStrings.get(Config.passwordRow);
        Config.databaseName = inputStrings.get(Config.kyrixDbNameRow);
        Config.d3Dir = inputStrings.get(Config.d3DirRow);
    }

    private static void getProjectObject() throws ClassNotFoundException, SQLException {

        String sql = "select content from " + Config.projectTableName + " where name = \'" + Config.projectName + "\';";
        try {
            ArrayList<ArrayList<String>> ret = DbConnector.getQueryResult(Config.databaseName, sql);
            if (ret.size() == 0) {
                project = null;
            } else {
                projectJSON = ret.get(0).get(0);
                Gson gson = new GsonBuilder().create();
                project = gson.fromJson(projectJSON, Project.class);
            }
        } catch (Exception e) {
            System.out.println("Cannot find definition of main project (db=" + Config.databaseName + ", table=" + Config.projectTableName + ")... waiting...");
            e.printStackTrace();
        }
    }
}
