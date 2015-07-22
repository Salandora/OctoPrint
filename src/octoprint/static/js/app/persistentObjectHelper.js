/**
 * Created by Salandora on 20.07.2015.
 */

function PersistentObjectHelper() {
    var self = this;

    self.usersettings = undefined;

    self.persistentObjects = {};
    self.updateTimer = undefined;

    // This Variable is used to make sure we don't end in an endless loop or overriding anydata with default Values
    self.saveData = true;

    self.setUserSettingsViewModel = function(usersettings) {
        self.usersettings = usersettings;
    }

    self.getTime = function () {
        return new Date().getTime();
    }

    self.addObject = function(key, target) {
        self.persistentObjects[key] = target;
    }

    self.setItem = function(key, value, localOnly) {
        if (!self.saveData) return;

        value = JSON.stringify(value);
        localStorage.setItem(key, value);

        if (self.updateTimer != undefined) {
            clearTimeout(self.updateTimer);
            self.updateTimer = undefined;
        }
        if (!localOnly && self.usersettings != undefined && self.usersettings.sync_settings()) {
            self.updateTimer = setTimeout(self.save, 1000);
        }
    };

    self.getItem = function(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        }
        catch (e) {
        }

        return undefined;
    }

    self.createSettings = function() {
        var persist = {};
        _.each(self.persistentObjects, function(value, key) {
            var keys = key.split('.');
            var tmp = persist[keys[0]] = {};
            var i = 1;

            while (i < keys.length-1) {
                tmp = tmp[keys[i]] = {};
            }

            tmp[keys[keys.length-1]] = value();
        });

        return persist;
    };

    self.onUserLoggedIn = function(response) {
        if (!self.usersettings.sync_settings()) return;

        if (response != undefined && response.settings.hasOwnProperty("persist")) {
            // Prevent saving data on login to prevent endless save-reload loop
            self.saveData = false;
            var iterateList = function(value, key) {
                if (_.isObject(value) && !_.isArray(value)) {
                    _.each(value, function (v, k) {
                        iterateList(v, key + '.' + k);
                    });
                } else if (self.persistentObjects.hasOwnProperty(key) && _.isFunction(self.persistentObjects[key])) {
                    self.persistentObjects[key](value);
                }
            };

            _.each(response.settings.persist, iterateList);
            self.saveData = true;
        }
    };

    self.save = function() {
        var settings = {
            "persist": self.createSettings()
        };

        self.usersettings.updateSettings(self.usersettings.currentUser().name, settings, function() {});

        self.updateTimer = undefined;
    }
};