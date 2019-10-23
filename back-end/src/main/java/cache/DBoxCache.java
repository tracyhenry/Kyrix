package cache;

import box.Box;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import main.Config;
import main.Main;
import project.Canvas;

public class DBoxCache {
    private static LinkedHashMap dBoxCache;
    private static LinkedHashMap dBoxCacheBox;

    public static void create() {
        dBoxCache =
                new LinkedHashMap<String, ArrayList<ArrayList<ArrayList<String>>>>(
                        Config.cacheSize + 1, 0.75f, true) {
                    @Override
                    protected boolean removeEldestEntry(
                            Map.Entry<String, ArrayList<ArrayList<ArrayList<String>>>> eldest) {
                        return size() > Config.cacheSize;
                    }
                };
        dBoxCacheBox =
                new LinkedHashMap<String, Box>(Config.cacheSize + 1, 0.75f, true) {
                    @Override
                    protected boolean removeEldestEntry(Map.Entry<String, Box> eldest) {
                        return size() > Config.cacheSize;
                    }
                };
    }

    public static void clear() {
        dBoxCache.clear();
        dBoxCacheBox.clear();
    }

    public static Box getSquaredBox(Box requestedBox, Box oldBox) throws Exception {
        double rBoxMinX = requestedBox.getMinx();
        double rBoxMinY = requestedBox.getMiny();
        double rBoxMaxX = requestedBox.getMaxx();
        double rBoxMaxY = requestedBox.getMaxy();
        double oBoxMinX = requestedBox.getMinx();
        double oBoxMinY = requestedBox.getMiny();
        double oBoxMaxX = requestedBox.getMaxx();
        double oBoxMaxY = requestedBox.getMaxy();
        double newMinX = Math.min(rBoxMinX, oBoxMinX);
        double newMinY = Math.min(rBoxMinY, oBoxMinY);
        double newMaxX = Math.max(rBoxMaxX, oBoxMaxX);
        double newMaxY = Math.max(rBoxMaxY, oBoxMaxY);
        Box newBox = new Box(newMinX, newMinY, newMaxX, newMaxY);
        return newBox;
    }

    public static Boolean isContained(Box requestedBox, Box oldBox) throws Exception {
        double rBoxMinX = requestedBox.getMinx();
        double rBoxMinY = requestedBox.getMiny();
        double rBoxMaxX = requestedBox.getMaxx();
        double rBoxMaxY = requestedBox.getMaxy();
        double oBoxMinX = requestedBox.getMinx();
        double oBoxMinY = requestedBox.getMiny();
        double oBoxMaxX = requestedBox.getMaxx();
        double oBoxMaxY = requestedBox.getMaxy();
        return (oBoxMinX <= rBoxMinX)
                && (oBoxMinY <= rBoxMinY)
                && (oBoxMaxX >= rBoxMaxX)
                && (oBoxMaxY >= rBoxMaxY);
    }

    public static ArrayList<ArrayList<ArrayList<String>>> getData(
            Canvas c, Box requestedBox, ArrayList<String> predicates) throws Exception {
        String projectName = Main.getProject().getName();
        String key = projectName + '-' + c.getId() + "-" + predicates;
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // cache hit
        if (dBoxCacheBox.containsKey(key)) {
            Box oldBox = (Box) dBoxCacheBox.get(key);
            // System.out.println(oldBox.getWKT() + "__"+requestedBox.getWKT());
            if (isContained(requestedBox, oldBox)) {
                System.out.println("cache hit!");
                return (ArrayList<ArrayList<ArrayList<String>>>) dBoxCache.get(key);
            }
        }
        System.out.println("==> cache miss!");
        return data;
    }

    public static void addData(
            ArrayList<ArrayList<ArrayList<String>>> data,
            Canvas c,
            Box requestedBox,
            ArrayList<String> predicates)
            throws Exception {
        String projectName = Main.getProject().getName();
        String key = projectName + '-' + c.getId() + "-" + predicates;
        ArrayList<ArrayList<ArrayList<String>>> allData = new ArrayList<>();
        if (dBoxCacheBox.containsKey(key)) {
            Box oldBox = (Box) dBoxCacheBox.get(key);
            Box squaredBox = getSquaredBox(requestedBox, oldBox);
            allData = (ArrayList<ArrayList<ArrayList<String>>>) dBoxCache.get(key);
            allData.addAll(data);
            dBoxCache.remove(key);
            dBoxCacheBox.remove(key);
            dBoxCache.put(key, allData);
            dBoxCacheBox.put(key, squaredBox);
        } else {
            dBoxCache.put(key, data);
            dBoxCacheBox.put(key, requestedBox);
        }
    }
}
