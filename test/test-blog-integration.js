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
        .then(post => {
          resPost.id.should.equal(post.id);
          resPost.title.should.equal(post.title);
          resPost.content.should.equal(post.content);
          resPost.author.should.contain(post.author.lastName);
          resPost.author.should.contain(post.author.lastName);
        });
    });
  });
  describe('POST endpoint', () => {

    it('should add a new blog post', () => {
      const newPost = generateBlogPost();
      
      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(res => {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.an('object');
          res.body.should.include.keys('id', 'title', 'content', 'author', 'created');
          res.body.title.should.equal(newPost.title);
          res.body.id.should.not.be.null;
          res.body.content.should.equal(newPost.content);
          res.body.author.should.contain(newPost.author.firstName);
          res.body.author.should.contain(newPost.author.lastName);
          return BlogPost.findById(res.body.id);
        })
        .then(post => {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
          post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName);
        });
    });
  });

  describe('PUT endpoint', () => {

    it('should update the fields supplied in the params', () => {
      const updateData = {
        title: 'Whatever',
        content: 'The turtle walks across the busy highway.',
        author: {
          firstName: 'Bagel',
          lastName: 'Toon'
        }
      };
      
      return BlogPost
        .findOne()
        .exec()
        .then(post => {
          updateData.id = post.id;

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData)
        })
        .then(res => {
          res.should.have.status(201);
          return BlogPost.findById(updateData.id).exec();
        })
        .then(post => {
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
          post.author.firstName.should.contain(updateData.author.firstName);
          post.author.lastName.should.contain(updateData.author.lastName);
        });
    });
  });

  describe('DELETE endpoint', () => {

    it('should delete a blog post by id', () => {
      let post;

      return BlogPost
        .findOne()
        .exec()
        .then(_post => {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(res => {
          res.should.have.status(204);
          return BlogPost.findById(post.id).exec();
        })
        .then(_post => {
          should.not.exist(_post);
        });
    });
  });
});