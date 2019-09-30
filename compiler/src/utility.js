// utility file for commonly shared functions

function checkArgs(objName, requiredArgs, requiredArgTypes, passedInArgs) {
    // check required args
    for (var i = 0; i < requiredArgs.length; i++) {
        if (!(requiredArgs[i] in args))
            throw new Error(
                "Constructing " + objName + ": " + requiredArgs[i] + " missing."
            );
        if (typeof args[requiredArgs[i]] !== requiredArgTypes[i])
            throw new Error(
                "Constructing " + objName + ": " +
                    requiredArgs[i] +
                    " must be " +
                    requiredArgTypes[i] +
                    "."
            );
        if (requiredArgTypes[i] == "string")
            if (args[requiredArgs[i]].length == 0)
                throw new Error(
                    "Constructing " + objName + ": " +
                        requiredArgs[i] +
                        " cannot be an empty string."
                );
    }
}
