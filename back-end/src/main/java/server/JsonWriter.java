package server;

import java.io.File;
import java.io.IOException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonMappingException;
import java.util.HashMap;
import java.util.List;

public class JsonWriter {
    public static void writeJSON(String description, List rawData) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            HashMap<String, List> jsonMap = new HashMap<>();
            jsonMap.put(description, rawData);
            mapper.writeValue(new File("./" + description + ".json"), jsonMap);
            System.out.println("--done writing--");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}