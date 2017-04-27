const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const faker = require('faker');

const should = chai.should();

const { BlogPost } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

let seedBlogPosts = () => {
  console.log('Seeding blog post data');
  const seedData = [];

  for(let i = 0; i < 10; i++){
    seedData.push(generateBlogPost());
  }
  return BlogPost.insertMany(seedData);
}

let generateBlogPost = () => {
  return {
    title: faker.lorem.words(),
    content: faker.lorem.paragraphs(),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    date: faker.date.recent()
  }
}

let tearDownDb = () => {
  console.warn('REMAIN CALM: DELETING DATABASE');
  return mongoose.connection.dropDatabase();
}

describe('Blog posts API resources', () => {

  before(function(){
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function(){
    return seedBlogPosts();
  });

  afterEach(function(){
    return tearDownDb();
  });

  after(function(){
    return closeServer();
  });

  describe('GET endpoint', () => {

    it('should return all existing blog posts', function () {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          res.should.have.status(200);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
           res.body.should.have.length.of(count)
        });
    });

    it('should return blog posts with the right fields', () => {
      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(res => {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.an('array');
          res.body.should.have.length.of.at.least(1);
          res.body.forEach(post => {
            post.should.be.an('object');
            post.should.include.keys('id', 'title', 'content', 'author', 'created');
          });

          resPost = res.body[0];
          return BlogPost.findById(resPost.id);
        })
        .then(function(post) {
          resPost.id.should.equal(post.id);
          resPost.title.should.equal(post.title);
          resPost.content.should.equal(post.content);
          resPost.author.should.contain(post.author.lastName);
          resPost.author.should.contain(post.author.lastName);
        });
    });
  });
});