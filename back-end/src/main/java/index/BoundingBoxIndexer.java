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
    public String getStaticDataQuery(Canvas c, int layerId, String predicate) {

        Layer l = c.getLayers().get(layerId);
        // get column list string
        String colListStr = l.getTransform().getColStr("");

        // construct static query
        String sql = "select " + colListStr + " from bbox_" + Main.getProject().getName() + "_"
                + c.getId() + "layer" + layerId;
        if (predicate.length() > 0)
            sql += " where " + predicate;
        sql += ";";

        return sql;

    }
}
