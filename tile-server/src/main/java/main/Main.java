package main;

import com.google.cloud.bigtable.hbase.BigtableConfiguration;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import index.Indexer;
import org.apache.hadoop.hbase.client.*;
import org.apache.hadoop.hbase.client.Connection;
import project.Project;
import server.Server;

import javax.script.ScriptException;
import java.io.*;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.util.Bytes;

public class Main {

	private static Project project = null;
	private static String projectJSON = "";
	// for big table
	private static Connection eegBigtableConn = null;
	private static Table eegTable = null;

	public static void main(String[] args) throws IOException,
			ClassNotFoundException,
			SQLException,
			ScriptException,
			NoSuchMethodException, InterruptedException {


		// connnect to big table
		connectBigtable();
		testBigtable();

		// read config file
		readConfigFile();

		// get project definition, create project object
		getProjectObject();

		// if project object is not null and is dirty, precompute
		if (project != null && isProjectDirty()) {
			System.out.println("Main project definition has been changed since last session, re-calculating indexes...");
			Indexer indexer = new Indexer();
			indexer.precompute();
			setProjectClean();
		}
		else if (project != null)
			System.out.println("Main project definition has not been changed since last session. Starting server right away...");

		// start server
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
		return (Integer.valueOf(ret.get(0).get(0)) == 1 ? true : false);
	}

	public static void setProjectClean() throws SQLException, ClassNotFoundException {

		String sql = "update " + Config.projectTableName + " set dirty = " + 0 + " where name = \'" + Config.projectName + "\';";
		DbConnector.executeUpdate(Config.databaseName, sql);
		DbConnector.commitConnection(Config.databaseName);
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
		Config.dbServer = inputStrings.get(Config.dbServerRow);
		Config.userName = inputStrings.get(Config.userNameRow);
		Config.password = inputStrings.get(Config.passwordRow);
		Config.databaseName = inputStrings.get(Config.kyrixDbNameRow);
		Config.d3Dir = inputStrings.get(Config.d3DirRow);
	}

	private static void getProjectObject() throws ClassNotFoundException {

		String sql = "select content from " + Config.projectTableName + " where name = \'" + Config.projectName + "\';";
		try {
			ArrayList<ArrayList<String>> ret = DbConnector.getQueryResult(Config.databaseName, sql);
			projectJSON = ret.get(0).get(0);
			Gson gson = new GsonBuilder().create();
			project = gson.fromJson(projectJSON, Project.class);
		} catch (Exception e) {
			System.out.println("Cannot find definition of main project... waiting...");
		}
	}

	// stuff for bigtable
	public static Table getEEGTable() {
		return eegTable;
	}

	private static void connectBigtable() throws IOException {

		String projectId = "mgh-neurology-poc-01";  // my-gcp-project-id
		String eegInstanceId = "eeg-table"; // my-bigtable-instance-id
		String eegTableId = "eegTable";    // my-bigtable-table-id
		eegBigtableConn = BigtableConfiguration.connect(projectId, eegInstanceId);
		eegTable = eegBigtableConn.getTable(TableName.valueOf(eegTableId));
	}

	private static void testBigtable() throws IOException, SQLException, ClassNotFoundException {

		// test for eeg
		// start/end rows
		String startRowKey = "abn10000_20140117_093552_000008";
		String endRowKey = "abn10000_20140117_093552_000018";

		long st = System.currentTimeMillis();
		Result result = eegTable.get(new Get(Bytes.toBytes("abn10000_20140117_093552_000008")));
		System.out.println(System.currentTimeMillis() - st);

		st = System.currentTimeMillis();
		result = eegTable.get(new Get(Bytes.toBytes("abn999_20140711_151337_000029")));
		System.out.println(System.currentTimeMillis() - st);

		st = System.currentTimeMillis();
		// new scan object
		Scan curScan = new Scan();
		curScan.withStartRow(Bytes.toBytes(startRowKey)).withStopRow(Bytes.toBytes(endRowKey));

		// Retrieve the result
		ResultScanner resultScanner = eegTable.getScanner(curScan);
		for (Result row : resultScanner)
			System.out.println(Bytes.toString(row.getRow()));
		System.out.println(System.currentTimeMillis() - st);

		// new scan object
		curScan = new Scan();
		startRowKey = "abn999_20140711_151337_000009";
		endRowKey = "abn999_20140711_151337_000109";
		curScan.withStartRow(Bytes.toBytes(startRowKey)).withStopRow(Bytes.toBytes(endRowKey));

		// Retrieve the result
		resultScanner = eegTable.getScanner(curScan);
		System.out.println(System.currentTimeMillis() - st);
	}
}
