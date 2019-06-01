package index;

import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.Main;
import main.DbConnector;
import project.Canvas;
import project.Layer;
import project.Placement;

import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.io.File;
import java.io.Serializable;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public abstract class BoundingBoxIndexer extends Indexer {

    @Override
    public ArrayList<ArrayList<ArrayList<String>>> getStaticData(Canvas c, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException {

        // container for data
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // loop over layers
        for (int i = 0; i < c.getLayers().size(); i ++) {

            // add an empty placeholder for static layers
            if (! c.getLayers().get(i).isStatic()) {
                data.add(new ArrayList<>());
                continue;
            }

            // get column list string
            String colListStr = c.getLayers().get(i).getTransform().getColStr("");

            // construct range query
            String sql = "select " + colListStr + " from bbox_" + Config.projectName + "_"
                    + c.getId() + "layer" + i;

            if (predicates.get(i).length() > 0)
                sql += " where " + predicates.get(i);
            sql += ";";

            // run query, add to response
            data.add(DbConnector.getQueryResult(Config.databaseName, sql));
        }

        return data;
    }
}