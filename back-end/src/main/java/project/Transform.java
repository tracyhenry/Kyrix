package project;

import java.io.Serializable;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import main.Config;
import main.DbConnector;

/** Created by wenbo on 4/3/18. */
public class Transform implements Serializable {

    private String id;
    private String query;
    private String db;
    private String dbsource;
    private String transformFunc;
    private String transformFuncBody;
    private ArrayList<String> columnNames, queriedColumnNames = null;
    private ArrayList<String> filterableColumnNames;
    private boolean separable;

    public String getId() {
        return id;
    }

    public String getQuery() {
        return query;
    }

    public String getDb() {
        return db;
    }

    public String getDbsource() {
        return dbsource;
    }

    public String getTransformFunc() {
        return transformFunc;
    }

    public String getTransformFuncBody() {
        return transformFuncBody;
    }

    public ArrayList<String> getColumnNames() throws SQLException, ClassNotFoundException {

        // if it is specified already, return
        if (columnNames.size() > 0) return columnNames;

        // if it is an empty transform, return an empty array
        if (getDb().isEmpty()) return columnNames;

        // otherwise the transform func is empty, fetch the schema from DB
        if (queriedColumnNames == null) {
            queriedColumnNames = new ArrayList<>();
            Statement rawDBStmt = DbConnector.getStmtByDbName(getDb(), true);
            String query = getQuery();
            if (Config.database == Config.Database.CITUS) {
                while (query.charAt(query.length() - 1) == ';')
                    query = query.substring(0, query.length() - 1);
                // assuming there is no limit 1
                query += " LIMIT 1;";
            }
            ResultSet rs = DbConnector.getQueryResultIterator(rawDBStmt, query);
            int colCount = rs.getMetaData().getColumnCount();
            for (int i = 1; i <= colCount; i++)
                queriedColumnNames.add(rs.getMetaData().getColumnName(i));
            DbConnector.closeConnection(getDb());
        }

        return queriedColumnNames;
    }

    public boolean isSeparable() {
        return separable;
    }

    public ArrayList<String> getFilterableColumnNames()
            throws SQLException, ClassNotFoundException {
        if (filterableColumnNames.size() == 0) return getColumnNames();

        return filterableColumnNames;
    }

    @Override
    public String toString() {
        return "Transform{"
                + "id='"
                + id
                + '\''
                + ", query='"
                + query
                + '\''
                + ", db='"
                + db
                + '\''
                + ", transformFunc='"
                + transformFunc
                + '\''
                + ", columnNames="
                + columnNames
                + ", separable="
                + separable
                + '}';
    }
}
