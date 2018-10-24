var Editor = function () {
	var isEditing = false;
	labels = {
		"Seizure":"Seizure",
		"LPD": "LPD",
		"GPD": "GPD",
		"LRDA": "LRDA",
		"GRDA": "GRDA",
		"Other": "Other"
	};
	var row = [];
	var editBox = null;
	var selectBox = null;
	var selectedRow = null;
	var getIdFromRow = function() {
		return row[0];
	}
	var hideEditor = function () {
		editBox.hide();
	};
	var submitEdit = function (button) {
		if (selectBox[0].selectedOptions.length > 0) {
			var selectedId = selectBox[0].selectedOptions[0].id;
			$.ajax({
				type: "POST",
				url: "edit",
				data: {
					"item": getIdFromRow(),
					"labeler": "mbw",
					"label": labels[selectedId]
				},
				success: function (data, status) {
					hideEditor();
				},
				error: function (data, status) {

				}
			});
		}
	};
	var displayEditor = function (data) {
		row = data;
		selectBox.html("");
		for (var key in labels) {
			var option = $("<option>").html(labels[key]);
			option.attr("id", key);
			selectBox.append(option);
		}
		editBox.show();
	};
	var startEditor = function () {
		editBox = $("<div id='editor'>");
		selectBox = $("<select>");
		var submitButton = $("<button>").text("Submit");
		submitButton.click(submitEdit);
		editBox.append(selectBox);
		editBox.append(submitButton);
		$("body").append(editBox);
		editBox.hide();
	};
	startEditor();
	return {
		edit: function (row) {
			displayEditor(row);
		},
		deselect: function () {
			isEditing = false;
		}
	};
}();