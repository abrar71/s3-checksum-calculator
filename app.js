const express = require('express')
const app = express()
const port = 3000

const AWS = require('aws-sdk')
const crypto = require('crypto')
const axios = require('axios')

app.get('/checksum', async (req, res) => {
  if (req.query && req.query.accessKeyId && req.query.secretAccessKey && req.query.region && req.query.bucket && req.query.filePath) {
    let webhook = (typeof req.query.webhook === 'string') ? req.query.webhook : null;

    let accessKeyId = req.query.accessKeyId;
    let secretAccessKey = req.query.secretAccessKey;
    let region = req.query.region;
    let bucket = req.query.bucket;
    let filePath = req.query.filePath;

    try {
      secretAccessKey = new Buffer(secretAccessKey, 'base64').toString('ascii');
    } catch (error) {
      return res.json({
        error: {
          message: 'Invalid base64 encoded secretAccessKey'
        }
      })
    }
    if (webhook !== null) {
      res.json({
        message: 'Processing checksum',
        webhook: webhook
      })
    }
    const s3 = new AWS.S3({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      region: region,
      signatureVersion: 'v4'
    })

    let s3Params = {
      Bucket: bucket,
      Key: filePath
    }
    let hash_md5 = crypto.createHash('md5')
    // let hash_sha256 = crypto.createHash('sha256')

    let readstream = s3.getObject(s3Params).createReadStream()

    readstream.on('error', (err) => {
      console.log("Error", err)
    })

    readstream.on('data', (data) => {
      hash_md5.update(data)
      // hash_sha256.update(data)
    })


    readstream.on('end', (err) => {
      if (err) return res.send(err)

      let md5checksum = hash_md5.digest('hex')
      // let sha256checksum = hash_sha256.digest('hex')
      let dataObj = {
        md5checksum: md5checksum,
        // sha256checksum: sha256checksum
        region: region,
        Bucket: bucket,
        filePath: filePath
      }

      if (webhook !== null) {

        axios({
          method: 'POST',
          url: webhook,
          data: dataObj,
        })
          .then((response) => {
            // console.log(response.data)
          })
          .catch(function (error) {
            // console.log(error)
          })

      } else {
        res.json(dataObj)
      }
    });
  } else {
    res.json({
      error: {
        message: 'Please enter all the query params accessKeyId, secretAccessKey, region, bucket, filePath'
      }
    })
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
})
