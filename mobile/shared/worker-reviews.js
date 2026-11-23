"use strict";

function readReview({ rating, comment = "" }, failure) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw failure(400, "Choose a rating from 1 to 5.");
  if (typeof comment !== "string" || comment.length > 500) throw failure(400, "Use up to 500 characters for your review.", "INVALID_REVIEW");
  return { rating, comment: comment.trim() };
}

module.exports = { readReview };
