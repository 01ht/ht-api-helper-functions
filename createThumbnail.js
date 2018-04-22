"use strict";
var admin = require("firebase-admin");
var path = require("path");
var sharp = require("sharp");
var getPublicURL = require("./getPublicURL.js");

try {
  admin.initializeApp();
} catch (e) {}

const bucket = admin.storage().bucket();

module.exports = function createThumbnail(width, fileName, metadata) {
  try {
    const options = {};
    if (metadata) options.metadata = metadata;

    const parsedFilename = path.parse(fileName);
    const thumbFileName = `${parsedFilename.root}${parsedFilename.dir}/${
      parsedFilename.name
    }-${width}w${parsedFilename.ext}`;

    // Create write stream for uploading thumbnail
    const thumbnailUploadStream = bucket
      .file(thumbFileName)
      .createWriteStream(options);

    // Create Sharp pipeline for resizing the image and use pipe to read from bucket read stream
    const pipeline = sharp();
    pipeline.
      .toFormat("jpeg")
      .resize(width)
      .max()
      .pipe(thumbnailUploadStream);

    bucket
      .file(fileName)
      .createReadStream()
      .pipe(pipeline);

    const streamAsPromise = new Promise((resolve, reject) =>
      thumbnailUploadStream.on("finish", resolve).on("error", reject)
    );

    return streamAsPromise.then(_ => {
      return getPublicURL(thumbFileName);
    });
  } catch (error) {
    console.log("createThumbnail: " + error.message);
    throw new Error("createThumbnail: " + error.message);
  }
};
