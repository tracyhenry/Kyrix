package box;

import box.BoxandData;
import project.Canvas;
import project.Project;

import java.sql.SQLException;
import java.util.ArrayList;

public interface BoxGetter {
    BoxandData getBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates, Project project) throws SQLException, ClassNotFoundException;
    BoxandData getLastBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates, Project project) throws SQLException, ClassNotFoundException;
    BoxandData getRectBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates, Project project) throws SQLException, ClassNotFoundException;

}
