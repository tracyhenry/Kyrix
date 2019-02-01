$(function () {
	globalVar.Editor = function () {

		var labels = {
			"Seizure": "Seizure",
			"LPD": "LPD",
			"GPD": "GPD",
			"LRDA": "LRDA",
			"GRDA": "GRDA",
			"Other": "Other"
		};
		var row = [];
		var floatBox = null;
		var editBox = null;
		var idBox = null;
		var buttonsBox = null;
		var passcodeBox = null;
        var backBtn=null;
		var labelDiv = null;
		var getIdFromRow = function () {
			return row[0] + "_" + row[1] + "_" + row[2] + "_" + row[3];
		};
		var submitEdit = function () {
			var label = $("input[name=label]:checked").val();
			var passcode = $("input[name=passcode]").val();
			$.ajax({
				type: "POST",
				url: "edit",
				data: {
					"item": getIdFromRow(),
					"labeler": passcode,
					"label": labels[label]
				},
				success: function (data, status) {
				},
				error: function (data, status) {
					console.log("Label Failed");
				}
			});
			if (param.labelingMode == "list")
				displayNext();
		};
		var backspaceEdit = function () {

            
            // funky logic - return list index then issue POST
            var res=displayPrev();
			
            if (param.labelingMode == "free" || res >= 0){
            
            var passcode = $("input[name=passcode]").val();
			$.ajax({
				type: "POST",
				url: "backspace",
				data: {
					"item": "",
					"labeler": passcode,
					"label": ""
				},
				success: function (data, status) {
				},
				error: function (data, status) {
					console.log("Label Failed");
				}
			});
            
            };

		};        
        
		var selectRow = function (data) {
			floatBox.insertAfter($("#containerSvg"));
			if (data != row) {
				editBox.show();
				row = data;
				idBox.text(getIdFromRow());
				labelDiv.html("");
				for (var key in labels) {
					var labelOptionDiv = $("<div>");
					var option = $("<input name='label' type='radio'>");
					option.val(key);
					option.attr('id', key);
					option.on('change', submitEdit);
					labelOptionDiv.append(option);
					var optionLabel = $("<label>");
					optionLabel.attr("for", key);
					optionLabel.text(labels[key]);
					labelOptionDiv.append(optionLabel);
					labelDiv.append(labelOptionDiv);
				}
			}
		};

		var startEditor = function () {
			floatBox = $("<div id='sidebar'>");
			editBox = $("<div id='editor'>");
			editBox.append($("<div id='editIdBox'>"));
			floatBox.append(editBox);
			$("body").append(floatBox);
			buttonsBox = $("#buttons");
			idBox = $("#editIdBox");
			editBox = $("#editor");
			labelDiv = $("<div>");
			editBox.append(labelDiv);
			passcodeBox = $("<div id='passcodeBox'>");
			passcodeBox.text("passcode: ");
			passcodeBox.append($("<input name='passcode' type='text'>"));
			editBox.append(passcodeBox);
			
            backBtn=$("<input id='backspaceBtn' value='back' type='button'>");
            backBtn.on('click',backspaceEdit);
            editBox.append(backBtn);            
            
		};
		startEditor();

		return {
			hide: function () {
				editBox.hide();
			},
			selectRow: function (row) {
				selectRow(row);
			}
		};
	}();
});
