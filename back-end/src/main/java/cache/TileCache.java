package cache;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import main.Config;
import project.Canvas;
import project.Layer;

public class TileCache {
    private static LinkedHashMap tileCache;

    public static void create() {
        tileCache =
                new LinkedHashMap<String, ArrayList<ArrayList<ArrayList<String>>>>(
                        Config.cacheSize + 1, 0.75f, true) {
                    @Override
                    protected boolean removeEldestEntry(
                            Map.Entry<String, ArrayList<ArrayList<ArrayList<String>>>> eldest) {
                        return size() > Config.cacheSize;
                    }
                };
    }

    public static ArrayList<ArrayList<ArrayList<String>>> getTile(
            Canvas c, int minx, int miny, ArrayList<String> predicates) throws Exception {

        String key = c + "-" + minx + "-" + miny + "-" + predicates;
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // cache hit
        if (tileCache.containsKey(key)) {
            System.out.println("cache hit!");
            return (ArrayList<ArrayList<ArrayList<String>>>) tileCache.get(key);
        }

        // cache miss, loop over each layer
        System.out.println("cache miss!");
        for (int i = 0; i < c.getLayers().size(); i++) {
            Layer curLayer = c.getLayers().get(i);
            // add an empty placeholder for static layers
            if (curLayer.isStatic()) data.add(new ArrayList<>());
            else
                data.add(
                        curLayer.getIndexer().getDataFromTile(c, i, minx, miny, predicates.get(i)));
        }
        tileCache.put(key, data);

        return data;
    }
}
