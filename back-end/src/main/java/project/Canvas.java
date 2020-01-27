package project;

import java.io.*;
import java.util.ArrayList;

/** Created by wenbo on 1/4/18. */
public class Canvas implements Serializable {

    private String id;
    private int w;
    private int h;
    private int pyramidLevel;
    private String wSql, hSql, wLayerId, hLayerId;
    private double zoomInFactorX, zoomInFactorY;
    private double zoomOutFactorX, zoomOutFactorY;
    private ArrayList<Layer> layers;
    private String axes;

    // https://stackoverflow.com/questions/64036/how-do-you-make-a-deep-copy-of-an-object-in-java
    // this method ensures that the canvas objects are not modified by request handlers in anyway
    // otherwise dynamic canvas size will be a mess
    public Canvas deepCopy() throws IOException, ClassNotFoundException {

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(bos);
        oos.writeObject(this);
        oos.flush();
        oos.close();
        bos.close();
        byte[] byteData = bos.toByteArray();
        ByteArrayInputStream bais = new ByteArrayInputStream(byteData);
        Canvas copy = (Canvas) new ObjectInputStream(bais).readObject();
        // set indexer again since indexer is transient
        // and thus ignored by serializer
        for (int i = 0; i < layers.size(); i++)
            copy.getLayers().get(i).setIndexer(layers.get(i).getIndexer());
        return copy;
    }

    public void setW(int w) {
        this.w = w;
    }

    public void setH(int h) {
        this.h = h;
    }

    public int getPyramidLevel() {
        return pyramidLevel;
    }

    public String getId() {
        return id;
    }

    public int getW() {
        return w;
    }

    public int getH() {
        return h;
    }

    public String getwSql() {
        return wSql;
    }

    public String gethSql() {
        return hSql;
    }

    public String getwLayerId() {
        return wLayerId;
    }

    public String gethLayerId() {
        return hLayerId;
    }

    public double getZoomInFactorX() {
        return zoomInFactorX;
    }

    public double getZoomInFactorY() {
        return zoomInFactorY;
    }

    public double getZoomOutFactorX() {
        return zoomOutFactorX;
    }

    public double getZoomOutFactorY() {
        return zoomOutFactorY;
    }

    public ArrayList<Layer> getLayers() {
        return layers;
    }

    public String getAxes() {
        return axes;
    }

    public String getDbByLayerId(String layerId) {

        return getLayers().get(Integer.valueOf(layerId)).getTransform().getDb();
    }

    @Override
    public String toString() {
        return "Canvas{"
                + "id='"
                + id
                + '\''
                + ", w="
                + w
                + ", h="
                + h
                + ", pyramidLevel="
                + pyramidLevel
                + ", wSql='"
                + wSql
                + '\''
                + ", hSql='"
                + hSql
                + '\''
                + ", wLayerId='"
                + wLayerId
                + '\''
                + ", hLayerId='"
                + hLayerId
                + '\''
                + ", zoomInFactorX="
                + zoomInFactorX
                + ", zoomInFactorY="
                + zoomInFactorY
                + ", zoomOutFactorX="
                + zoomOutFactorX
                + ", zoomOutFactorY="
                + zoomOutFactorY
                + ", layers="
                + layers
                + ", axes='"
                + axes
                + '\''
                + '}';
    }
}
