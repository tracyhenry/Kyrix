# Tile Server API
**:small_orange_diamond: Fetching the Definition of the First Canvas**
----
* **URL:**  `/first`

* **Method:** `POST`

* **Data Params:** none.

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object containing the following fields:
    
    |Name|Description|
    |:---:|:---:|
    |`initialViewportX`|The `x` coordinate of the viewport. |
    |`initialViewportY`|The `y` coordinate of the viewport. |
    |`viewportWidth`|The width of the viewport (in pixel). This is fixed for the entire project.|
    |`viewportHeight`|The height of the viewport (in pixel). This is fixed for the entire project.|
    |`initialCanvasId`|The id of the first canvas. |
    |`initialPredicate`|The predicate that is supplied to the query of the first canvas. |
 
* **Error Response:**
  * **Code:** 405 BAD METHOD <br />

* **Sample Call:**
  ```javascript
    $.post("/first/", {}, function (data, status) {
      response = JSON.parse(data);
      viewportX = response.initialViewportX;
      viewportY = response.initialViewportY;
      viewportWidth = response.viewportWidth;
      viewportHeight = response.viewportHeight;
      curCanvasId = response.initialCanvasId;
      predicate = response.initialPredicate;
      svg = d3.select("body").append("svg")
          .attr("width", viewportWidth)
          .attr("height", viewportHeight);
      renderSVG();
    });
  ```

* **Notes:**
  This API is called when the frontend file is first loaded. Note that frontend can only get the **definition** of this first canvas. Relevant tuples inside the viewport should be retrieved using the `window` request.  

**:small_orange_diamond: Fetching the Definition of a Canvas by ID**
----
* **URL:**  `/canvas`

* **Method:** `POST`

* **Data Params:** `id`- a string representing the id of the canvas requested.

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object containing two fields `canvas` and `jump`. The `canvas` field contains the definition of the requested canvas, which contains the following subfields (corresponding to those defined in the spec API):
    
    |Name|Description|
    |:---:|:---:|
    |`id`|The id of the canvas. |
    |`w`/`h`|Width/height of the canvas. |
    |`query`|Query used to fetch data. |
    |`db`|Name of the database that `query` is run against.|
    |`placement`|Placement function (in Javascript).|
    |`rendering`|Rendering function (in Javascript).|
    |`seperable`|True/False - whether the calculation of `placement` is per-tuple or not.|
    
     The `jump` field is an array containing definitions of jumps starting from the requested canvas. Each jump contains the following fields (corresponding to those defined in the spec API):
   
    |Name|Description|
    |:---:|:---:|
    |`sourceId`|The id of the source canvas. This equals the id of the requested canvas. |
    |`destId`|The id of the destination canvas. |
    |`newViewport`|A Javascript function calculating the new viewport after jump. This function will either calculate a constant viewport, or a viewport centered at one tuple. See spec API for details on input/output of this function.|

   
* **Error Response:**
  * **Code:** 405 BAD METHOD <br />
  
  Or
  
  * **Code:** 400 BAD REQUEST <br/> 
    **Content:** canvas `id` does not exist.

* **Sample Call:**
  ```javascript          
    $.ajax({
      type : "POST",
      url : "canvas",
      data : curCanvasId,
      success : function (data, status) {
          curCanvas = JSON.parse(data).canvas;
          curJump = JSON.parse(data).jump;
      },
      async : false
    });
  ```
  
**:small_orange_diamond: Calculating a New Viewport after Jump**
----
* **URL:**  `/viewport`

* **Method:** `POST`

* **Data Params:** 
  * `canvasId`- The id of the destination canvas.
  * `predicate`- A PK/FK or PK/PK join predicate which should uniquely determine a tuple of the destination canvas. 

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object containing two fields `cx` and `cy` representing the viewport center after jump, which is the centroid of the tuple filtered by `predicate`. 
    
* **Error Response:**
  * **Code:** 405 BAD METHOD <br />
  
  Or
  * **Code:** 400 BAD REQUEST <br />
    **Content:** canvas id missing/predicate missing/canvas `canvasId` does not exist/Bad predicate (predicate does not uniquely determine a tuple).

* **Sample Call:**
  ```javascript
    $.ajax({
        type : "POST",
        url : "viewport",
        data : "canvasId=" + curCanvasId + "&predicate=" + predicate,
        success : function (data, status) {
            var cx = JSON.parse(data).cx;
            var cy = JSON.parse(data).cy;
        },
        async : false
    });
  ```

* **Notes:**
  This API call is used when the `newViewport` function of this jump is **NOT** producing a constant viewport. In this case, frontend needs to communicate with the tile server using this API call to get the new viewport center coordinates. 


**:small_orange_diamond: Fetching Data inside a Window**
----
* **URL:**  `/window`

* **Method:** `POST`

* **Data Params:** 
  * `id`- The id of the current canvas. 
  * `x1`, `x2`, `y1`, `y2`- four screen coordinates determining a window. 
  * `predicate`- the predicate that is supplied to the query of the current canvas.

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** an array `renderData` containing data tuples inside the requested window. The definition of *inside a window* may be different when different algorithms (centroid/bounding box) are used. 
    
* **Error Response:**
  * **Code:** 405 BAD METHOD <br />
  
  Or
  * **Code:** 400 BAD REQUEST <br />
    **Content:** canvas id missing/window coordinate missing/canvas `id` does not exist.

* **Sample Call:**
  ```javascript
    var postData = "id=" + curCanvasId + "&"
        + "x1=" + x1 + "&"
        + "y1=" + y1 + "&"
        + "x2=" + y2 + "&"
        + "y2=" + y2 + "&"
        + "predicate=" + predicate;
    $.post("/window", postData, function (data, status) {
        var response = JSON.parse(data);
        var renderData = response.renderData;
        renderFunc(svgs[i][j], renderData);
        registerJumps(svgs[i][j], renderData);
    });
  ```
