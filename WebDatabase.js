window.WebDatabase = (function(_settings){
	var internal = {
		db : null,
		connected : false
	};
	
	var settings = {
		debug : false,
		shortName : null,
		version : 1.0,
		displayName : null,
		maxSize : 2*1024*1024, // (2MB)
		DDL : null
	};
	
	var utils = {
		debug : {
			log : function(){
				if(settings.debug){
					console.log.apply(console, arguments);
				}
			},
			error : function(){
				if(settings.debug){
					console.error.apply(console, arguments);
				}
			}
		},
		
		extends : function(objectA, objectB){
			var obj = new Object();
			for(var x = 0; x < arguments.length; x++){
				for(var k in arguments[x]){
					obj[k] = arguments[x][k];
				}
			}
			return obj;
		}
	};
	
	settings = utils.extends(settings, _settings);
	
	var privateMethods = {
		connect : function(){
			try{
				utils.debug.log("[connect]", "connecting to database...");
				internal.db = window.openDatabase(settings.dbName, settings.version, settings.displayName, settings.maxSize);
				internal.connected = true;
			}catch(ex){
				alert("Could not open connection to database\n\n"+ex);
				utils.debug.error("[connect]", "fatal error", ex);
				return false;
			}
			
			if(settings.DDL && settings.DDL.tables){
				for(var table in settings.DDL.tables){
					var columns = [];
					for(var column in settings.DDL.tables[table].columns){
						columns.push(column+" "+settings.DDL.tables[table].columns[column]);
					}
					
					var fk = [];
					if(settings.DDL.tables[table].foreign_keys){
						for(var fkColumn in settings.DDL.tables[table].foreign_keys){
							var constraint = settings.DDL.tables[table].foreign_keys[fkColumn];
							fk.push([
								"FOREIGN KEY ("+fkColumn+") REFERENCES "+constraint.table+"("+constraint.column+") MATCH SIMPLE",
								"ON UPDATE CASCADE ON DELETE RESTRICT"
							].join(" "));
						}
					}
					
					var fkSql = fk.length ? ", "+fk.join(",") : "";
					var sql = "CREATE TABLE IF NOT EXISTS "+table+"("+(columns.join(", "))+fkSql+")";
					
					publicMethods.query(sql);
				}
			}
			
			if(settings.DDL && settings.DDL.views){
				for(var view in settings.DDL.views){
					var sql = "CREATE VIEW IF NOT EXISTS "+view+" AS "+settings.DDL.views[view];
					publicMethods.query(sql);
				}
			}
		},
		
		defaultExecuteSqlErrorHandler : function(tx, error){
			alert("Could not execute query\n\n[BD-"+error.code+"] "+error.message);
		},
		
		interpreter : {
			filters : function(filters){
				var filter = [], params = [];
				for(var column in filters){
					if(filters[column].operator.toUpperCase() == "BETWEEN"){
						filter.push(column+" BETWEEN ? AND ?");
						params.push(filters[column].valueA, filters[column].valueB);
					}else{
						filter.push(column+" "+filters[column].operator+" ?");
						params.push(filters[column].value);
					}
				}
				return {
					sql : filter.length ? "WHERE "+filter.join(" AND ") : "",
					params : params
				};
			},
			orderBy : function(orderList){
				var order = [];
				if(typeof orderList == "string"){
					order.push(orderList);
				}else if(typeof orderList == "object"){
					for(var column in orderList){
						order.push(column+" "+orderList[column]);
					}
				}
				return order.length ? "ORDER BY "+order.join(", ") : "";
			},
			limit : function(limit){
				return typeof limit == "number" ? "LIMIT "+limit : "";
			}
		}
	};
	
	var publicMethods = {
		getDbStatus : function(){
			return internal.connected ? "connected" : "disconnected";
		},
		
		query : function(sql, params, sqlStatementCallback, sqlStatementErrorCallback){
			if(!internal.connected){
				utils.debug.error("[query]", "not connected", sql);
				return false;
			}
			
			internal.db.transaction(function(tx){
				tx.executeSql(sql,
					(params && params.length) ? params : null,
					function(tx, results){
						utils.debug.log("[query]", sql);
						typeof sqlStatementCallback == "function" ? sqlStatementCallback(tx, results) : null
					},
					function(tx, error){
						utils.debug.error("[query]", sql+"\n\t\tparams:", params, "\n\t\t"+error.message);
						if(typeof sqlStatementErrorCallback == "function"){
							sqlStatementErrorCallback(tx, error);
						}else{
							privateMethods.defaultExecuteSqlErrorHandler(tx, error);
						}
					}
				);
			});
		},
		
		simpleInsert : function(options){
			var options = utils.extends({
				table : "",
				data : {},
				onSuccess : function(){},
				onError : function(){}
			}, options);
			
			var columns = [], values = [], params = [];
			for(var column in options.data){
				columns.push(column);
				values.push(options.data[column]);
				params.push("?");
			}
			
			var sql = "INSERT INTO "+options.table+"("+columns.join(", ")+") VALUES("+params.join(", ")+")";
			publicMethods.query(sql, values, function(tx, results){
				options.onSuccess(results.insertId, results);
			}, options.onError);
		},
		
		simpleUpdate : function(options){
			var options = utils.extends({
				table : "",
				data : {},
				filter : null,
				onSuccess : function(){},
				onError : function(){}
			}, options);
			
			var params = [];
			
			var columns = [];
			for(var column in options.data){
				columns.push(column+" = ?");
				params.push(options.data[column]);
			}
			
			var filters = privateMethods.interpreter.filters(options.filter);
			params = params.concat(filters.params);
			
			var sql = "UPDATE "+options.table+" SET "+columns.join(", ")+" "+filters.sql;
			publicMethods.query(sql, params, function(tx, results){
				options.onSuccess(results.rowsAffected, results);
			}, options.onError);
		},
		
		simpleDelete : function(options){
			var options = utils.extends({
				table : "",
				filter : null,
				onSuccess : function(){},
				onError : function(){}
			}, options);
			
			var filters = privateMethods.interpreter.filters(options.filter);
			
			var sql = "DELETE FROM "+options.table+" "+filters.sql;
			publicMethods.query(sql, filters.params, function(tx, results){
				options.onSuccess(results.rowsAffected, results);
			}, options.onError);
		},
		
		simpleSelect : function(options){
			var options = utils.extends({
				table : "",
				columns : [],
				filter : null,
				order : null,
				limit : null,
				onSuccess : function(){},
				onError : function(){}
			}, options);
			
			var filters = privateMethods.interpreter.filters(options.filter);
			var orderBy = privateMethods.interpreter.orderBy(options.order);
			var limit = privateMethods.interpreter.limit(options.order);
			
			var sql = "SELECT "+options.columns.join(", ")+" FROM "+options.table+" "+filters.sql+" "+orderBy+" "+limit;
			publicMethods.query(sql, filters.params, function(tx, results){
				options.onSuccess(results.rows.length, results);
			}, options.onError);
		}
	};
	
	privateMethods.connect();
	return publicMethods;
});
