
# WebDatabase.js
WebDatabase.js is a javascript library to abstract web database interaction on client side (e.g. browser).

# Dependecy
No other library is required.

# Compatibility
Currently only Web SQL Database is supported. That means this library will work on all browsers who support it.
<br/>You can check browser suppport at http://caniuse.com/#feat=sql-storage
<br/>More information on Web SQL Database at http://www.w3.org/TR/webdatabase/

# Usage
Include Javascript Library file called WebDatabase.js in your source code:
```html
<script src="WebDatabase.js" type="text/javascript" charset="utf-8"></script>
```

Then you can use it this way:
```html
<script type="text/javascript">
	// Opens connection and creates tables/views
	var db = new WebDatabase({
		shortName : "TestDB",
		displayName : "TestDB",
		DDL : {
			tables : { // An object containing tables and its columns
				user : {
					user_id : "integer PRIMARY KEY",
					name : "text NOT NULL",
					email : "text",
					phone : "text"
				},
				table_name2 : {
					field1 : "field_type",
					field2 : "field_type"
				},
				table_name3 : {
					field1 : "field_type",
					field2 : "field_type"
				}
			}, // An object containing views and its query
			views : {
				user_list : "SELECT * FROM user ORDER BY name"
			}
		}
	});
	
	// Inserting data
	db.simpleInsert({
		table : "user",
		data : { // Data to be inserted
			name : "User Test",
			email : "test@email.com",
			phone : "00000-0000"
		},
		onSuccess : function(insertId, results){ // This callback will be executed when data is successfully inserted
			alert("Success callback");
		},
		onError : function(){ // This callback will be executed when data is NOT inserted
			alert("Error callback");
		}
	});
	
	// Selecting data
	db.simpleSelect({
		table : "user", // Table or view name
		columns : ["*"], // Columns to be returned; it can be an array of column name or an array containing "*" to return all columns
		filter : {
			user : {
				id : {
					operator : ">",
					value : 1
				}
			}
		},
		order : {
			name : "ASC",
			email : "DESC"
		},
		limit : 3,
		onSuccess : function(numRows, results){
			for(var x = 0; x < numRows; x++){
				alert(results.rows.item(x).name);
			}
		},
		onError : function(){
			alert("Error callback");
		}
	});
	
	// Updating data
	db.simpleUpdate({
		table : "user",
		data : {
			name : "User Test2"
		},
		filter : {
			user_id : {
				operator : "=",
				value : 1
			}
		},
		onSuccess : function(rowsAffected, results){
			alert("Success callback");
		},
		onError : function(){
			alert("Error callback");
		}
	});
	
	// Deleting data
	db.simpleDelete({
		table : "user",
		filter : {
			id : {
				operator : "=",
				value : 1
			}
		},
		onSuccess : function(rowsAffected, results){
			alert("Success callback");
		},
		onError : function(){
			alert("Error callback");
		}
	});
	
	// Or you can execute any query this way:
	db.query("SELECT * FROM user WHERE user_id BETWEEN ? AND ? ORDER BY name", [1, 5],
		function(tx, results){
			alert("Success callback");
		}, function(){
			alert("Error callback");
		}
	);
</script>
```
