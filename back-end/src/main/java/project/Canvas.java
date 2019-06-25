package project;

import java.io.*;
import java.util.ArrayList;

/** Created by wenbo on 1/4/18. */
public class Canvas implements Serializable {

    private String id;
    private int w;
    private int h;
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
        return (Canvas) new ObjectInputStream(bais).readObject();
    }

    public void setW(int w) {
        this.w = w;
    }

    public void setH(int h) {
        this.h = h;
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

        return this.getLayers().get(Integer.valueOf(layerId)).getTransform().getDb();
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
