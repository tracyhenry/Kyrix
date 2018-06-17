package cache;

import com.google.gson.Gson;

import java.util.ArrayList;
import java.util.Map;
import project.Canvas;
import java.util.LinkedHashMap;

public class TileCache {
    private static LinkedHashMap tileCache;
    private static int cacheSize = 10;

    public static boolean cacheHit(Canvas c, int minx, int miny, ArrayList<String> predicates){
        String key = c + "-" + minx + "-" + miny + "-" + predicates;
        return tileCache.containsKey(key);
    }
    public static ArrayList<ArrayList<ArrayList<String>>> getFromCache(Canvas c, int minx, int miny, ArrayList<String> predicates){
        String key = c + "-" + minx + "-" + miny + "-" + predicates;
        return (ArrayList<ArrayList<ArrayList<String>>>) tileCache.get(key);
    }
    public static void putIntoCache(Canvas c, int minx, int miny, ArrayList<ArrayList<ArrayList<String>>> data, ArrayList<String> predicates){

        String key = c + "-" + minx + "-" + miny + "-" + predicates;
        tileCache.put(key, data);
    }

    public static void create() {
        tileCache = new LinkedHashMap<String, ArrayList<ArrayList<ArrayList<String>>>>(cacheSize + 1, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, ArrayList<ArrayList<ArrayList<String>>>> eldest) {
                return size() > cacheSize;
            }
        };
    }
}

