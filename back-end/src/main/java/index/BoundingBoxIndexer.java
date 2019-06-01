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
    public String getStaticDataQuery(Canvas c, Layer l, int i, ArrayList<String> predicates) {
        // get column list string
        String colListStr = l.getTransform().getColStr("");


        // construct range query
        String sql = "select " + colListStr + " from bbox_" + Config.projectName + "_"
                + c.getId() + "layer" + i;

        if (predicates.get(i).length() > 0)
            sql += " where " + predicates.get(i);
        sql += ";";

        return sql;

    }
}