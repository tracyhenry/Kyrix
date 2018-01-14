package index;

import javax.script.ScriptException;
import java.sql.SQLException;

/**
 * Created by wenbo on 1/12/18.
 */
public abstract class Indexer {

	public abstract void precompute() throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException;
}
