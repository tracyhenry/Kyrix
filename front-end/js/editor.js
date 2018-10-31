var editor = function() {

	var labels = {
			"Seizure": "Seizure",
			"LPD": "LPD",
			"GPD": "GPD",
			"LRDA": "LRDA",
			"GRDA": "GRDA",
			"Other": "Other"
		};
	var row = [];
	var editBox = null;
	var selectBox = null;
	var getIdFromRow = function () {
		return row[0] + "_" + row[1] + "_" + row[2] + "_" + row[3];
	};
	var hideEditor = function () {
		editBox.hide();
	};
	var submitEdit = function () {
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
		$('#editIdBox').text(getIdFromRow());
		editBox.show();
	};
	var startEditor = function () {
		editBox = $("<div id='editor'>");
		selectBox = $("<select>");
		var submitButton = $("<button id='editButton'>").text("Submit");
		var idBox = $("<div id='editIdBox'>");
		submitButton.click(submitEdit);
		editBox.append(idBox);
		editBox.append(selectBox);
		editBox.append(submitButton);
		$("body").append(editBox);
		editBox.hide();
	};
	startEditor();

	return displayEditor;
};
