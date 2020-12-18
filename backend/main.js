const morgan = require('morgan');
const express = require('express');
const mysql = require('mysql2/promise');
const MongoClient = require('mongodb').MongoClient;
const aws = require('aws-sdk');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000
const app = express()

//MySQL Connection And Queries
const pool = mysql.createPool({
	host: process.env.DB_HOST || 'localhost',
	port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'fred',
    password: process.env.DB_PASSWORD || 'fred',
    database: process.env.DB_NAME || 'paf2020',
    connectionLimit: 4,
    timezone: '+08:00'
})
const MYSQL_AUTHENTICATE = 'select * from user where user_id = ? and password = ?';

const makeQuery = (sql, pool) => {
	return async (args) => {
		const conn = await pool.getConnection();
		try {
			const result = await conn.query(sql, args);
			retrievedUser = result[0][0];
			return retrievedUser;
		}
		catch(error) {
			return error;
		}
		finally{
			conn.release();
		}
	}
}

const getUserCredentials = makeQuery(MYSQL_AUTHENTICATE, pool);

//AWS and Multer
const multipart = multer({dest: __dirname + "/uploads"});
const ENDPOINT = new aws.Endpoint("sfo2.digitaloceanspaces.com");
const S3BUCKET = process.env.S3BUCKET || 'ibffsd';
const S3 = new aws.S3({
    endpoint: ENDPOINT,
    accessKeyId: process.env.S3ACCESSKEY,
    secretAccessKey: process.env.S3SECRETKEY
});

//MongoDB
const mongoURL = "mongodb://localhost:27017"
const mongoClient = new MongoClient(mongoURL, {useNewUrlParser: true, useUnifiedTopology: true});
const MONGO_DB = process.env.MONGODBNAME || 'thoughtshare';
const MONGO_COLLECTION = process.env.MONGOCOLLECTION || 'thoughts';


app.use(morgan('combined'))

app.use(express.static(__dirname + '\\dist\\frontend'));

app.post('/api/authenticate', express.json(), async (req, resp) => {
	const username = req.body.username;
	const password = req.body.password;
	const shaHash = crypto.createHash('sha1');
	shaHash.update(password);
	const hashValue = shaHash.digest('hex');

	try {
		const result = await getUserCredentials([username, hashValue]);
		if(result !== undefined) {
			resp.status(200);
			resp.type('application/json');
			resp.json({status: 200, message: 'Login success!'});
		}
		else {
			resp.status(401);
			resp.type('application/json');
			resp.json({error: 'Incorrect credentials!'});
		}
	}
	catch(error) {
		resp.status(500);
		resp.send(error);
	}
})

app.post('/api/upload', multipart.single('file'), async (req, resp) => {
	const shaHash = crypto.createHash('sha1');
	shaHash.update(req.body.password);
	const hashValue = shaHash.digest('hex');

	try{
		const user = await getUserCredentials([req.body.username, hashValue]);
		if(retrievedUser !== undefined) {
			fs.readFile(req.file.path, (err, file) => {
				const params = {
					Bucket: S3BUCKET,
					Key: req.file.filename,
					Body: file,
					ACL: "public-read",
					ContentType: req.file.mimetype,
					ContentLength: req.file.size,
					Metadata: {
						"filename": req.file.filename,
						"uploadedby": req.body.username,
						"timestamp": new Date().toISOString(),
					}
				};
		
				S3.putObject(params, (error, result) => {
					if(error) {
						resp.status(500);
						resp.send(error);
					}
					else {
						mongoClient.db(MONGO_DB).collection(MONGO_COLLECTION)
							.insertOne({
								title: req.body.title,
								comments: req.body.comments,
								image: req.file.filename,
								timestamp: new Date().toISOString()
							})
							.then(result => {
								resp.status(200);
								resp.type('application/json');
								resp.send({_id: result['ops'][0]._id});
								fs.unlink(req.file.path, () => {});
							})
							.catch(error => {
								resp.status(500);
								resp.send(error);
							});
					}
				});
			});
		}
		else {
			resp.status(401);
			resp.type('application/json');
			resp.json({});
		}
	}
	catch(error) {
		resp.status(500);
		resp.send(error);
	}
})

const p0 = new Promise(async (resolve, reject) => {
	const conn = await pool.getConnection()
    try{
        await conn.ping();
        resolve(true);
    }
    catch(error) {
        reject(false);
    }
    finally {
        conn.release();
    }
})

const p1 = new Promise(async (resolve, reject) => {
	S3.listBuckets((error, data) => {
		if(error) {
			reject(false);
		}
		else {
			let bucketArray = data.Buckets.map(v =>{return v.Name});
			if(bucketArray.includes(S3BUCKET)) {
				resolve(true);
			}
			else {
				reject(false);
			}
		}
	});
})

const p2 = new Promise(async (resolve, reject) => {
	mongoClient.connect()
        .then(result => {
            resolve(true);
        })
        .catch(error => {
            reject(false);
        });
})

Promise.all([p0, p1, p2])
	.then(result => {
		app.listen(PORT, () => {
			console.info(`Application started on port ${PORT} at ${new Date()}`)
		})		
	})
	.catch(error => {
		console.info('Error: ', error);
	});