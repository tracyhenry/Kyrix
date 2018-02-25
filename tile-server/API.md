# Tile Server API
**1. Fetching the Definition of the First Canvas**
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
