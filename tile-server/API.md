# Tile Server API
**:eyes: Fetching the Definition of the First Canvas**
----
* **URL:**  `/first`

* **Method:** `POST`
  
*  **URL Params:** none.

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

**:eyes: Fetching the Definition of a Canvas by ID**
----
* **URL:**  `/canvas`

* **Method:** `POST`
  
*  **URL Params:** none.

* **Data Params:** `id` a string representing the id of the canvas requested.

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
    |`newViewport`|A Javascript function calculating the new viewport after jump. See spec API for details on input/output of this function.|

   
* **Error Response:**
  * **Code:** 405 BAD METHOD <br />
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
  
