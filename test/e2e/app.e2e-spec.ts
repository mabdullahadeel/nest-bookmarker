import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as pactum from 'pactum';
import { like } from 'pactum-matchers';
import { SignupDto } from 'src/auth/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookmarkDto } from 'src/bookmarks/dto';

const BASE_URL = 'http://localhost:';
const PORT = '3030';

const testServerUrl = BASE_URL + PORT;

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );

    await app.init();
    await app.listen(PORT, () => `test server listening on ${testServerUrl}`);

    prisma = app.get(PrismaService);
    await prisma.cleanDB(true, true);

    pactum.request.setBaseUrl(testServerUrl);
  });

  afterAll(async () => {
    app && (await app.close());
  });

  const signupDto: SignupDto = {
    email: '',
    password: '',
  };
  const invalidEmail = 'invalidemail@testmail.com';
  const invalidPassword = 'not-super-secret';
  const validEmail = 'abdadeel@testmail.com';
  const validPassword = 'abCD123!';
  const updatedFirstName = 'Abdullah';
  const updatedLastName = 'Adeel';
  const updatedPassword = 'super-secret';

  describe('Auth', () => {
    describe('Signup', () => {
      it('invalid email should not create user', () => {
        return pactum
          .spec()
          .post(`/auth/signup`)
          .withBody({ password: validPassword, email: '' })
          .expectStatus(400);
      });

      it('invalid password should not create user', () => {
        return pactum
          .spec()
          .post(`/auth/signup`)
          .withBody({
            email: validEmail,
            password: '',
          })
          .expectStatus(400);
      });

      it('invalid email and password should not create user', () => {
        return pactum
          .spec()
          .post(`/auth/signup`)
          .withBody({ email: '', password: '' })
          .expectStatus(400);
      });

      it('valid email and password should create user', () => {
        signupDto.email = validEmail;
        signupDto.password = validPassword;

        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(signupDto)
          .expectStatus(201)
          .expectJsonMatch({
            user: {
              email: signupDto.email,
              id: like(1),
              firstName: null,
              lastName: null,
            },
          });
      });
    });

    describe('Signin', () => {
      it('invalid email should not be allowed', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: invalidEmail, password: signupDto.password })
          .expectStatus(403)
          .stores('user_access_token', 'access_token');
      });

      it('invalid password should not be allowed', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: signupDto.email, password: invalidPassword })
          .expectStatus(403)
          .stores('user_access_token', 'access_token');
      });

      it('invalid email and password should not be allowed', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({
            email: 'invalidemail@mymail.com',
            password: 'not-super-secret',
          })
          .expectStatus(403)
          .stores('user_access_token', 'access_token');
      });

      it('valid email and password should log the user in', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(signupDto)
          .expectStatus(200)
          .stores('user_access_token', 'access_token');
      });
    });
  });

  describe('User', () => {
    describe('Get user', () => {
      it('should not be able to get current user with invalid token', () => {
        return pactum
          .spec()
          .get('/users/me')
          .withHeaders({
            Authorization: 'Bearer invalid-token',
          })
          .expectStatus(401);
      });

      it('Get current user', () => {
        return pactum
          .spec()
          .get('/users/me')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .expectStatus(200)
          .expectJsonMatch({
            email: like('string'),
            id: like(1),
            firstName: null,
            lastName: null,
          });
      });
    });

    describe('Edit user', () => {
      it('update users first name and last name', () => {
        return pactum
          .spec()
          .patch('/users')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody({
            firstName: updatedFirstName,
            lastName: updatedLastName,
          })
          .expectStatus(200)
          .expectJsonMatch({
            firstName: updatedFirstName,
            lastName: updatedLastName,
          });
      });

      it('invalid old password dont update user password', () => {
        return pactum
          .spec()
          .patch('/users/me/password')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody({
            password: updatedPassword,
            old_password: 'random',
          })
          .expectStatus(400);
      });

      it('update user password', () => {
        return pactum
          .spec()
          .patch('/users/me/password')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody({
            password: updatedPassword,
            old_password: signupDto.password,
          })
          .expectStatus(200);
      });
    });
  });

  describe('Bookmark', () => {
    const bookmarkDto: CreateBookmarkDto = {
      title: 'Test Bookmark',
      url: 'https://test.com',
      description: 'Test Bookmark Description',
    };

    describe('Create Bookmarks', () => {
      it('should not be able to create bookmark when not logged in', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withBody(bookmarkDto)
          .expectStatus(401);
      });

      it('should not be able to create bookmark without title', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody({
            title: '',
            url: bookmarkDto.url,
            description: bookmarkDto.description,
          })
          .expectStatus(400);
      });

      it('should not be able to create bookmark without url', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody({
            title: bookmarkDto.title,
            url: '',
            description: bookmarkDto.description,
          })
          .expectStatus(400);
      });

      it('should not be able to create bookmark with invalid url', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody({
            title: bookmarkDto.title,
            url: 'invalid-url',
            description: bookmarkDto.description,
          })
          .expectStatus(400);
      });

      it('should  be able to create bookmark with with valid data', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody(bookmarkDto)
          .expectStatus(201)
          .stores('create_bookmark_id', 'id');
      });
    });

    describe('Get Bookmarks', () => {
      it('should not be able to get all bookmarks when not logged in', () => {
        return pactum.spec().get('/bookmarks').expectStatus(401);
      });

      it('should be able to get all bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .expectStatus(200)
          .expectJsonLength(1)
          .expectJsonMatch([
            {
              id: like(1),
              title: like('string'),
              url: like('string'),
              description: like('string'),
              userId: like(1),
              createdAt: like('string'),
              updatedAt: like('string'),
            },
          ]);
      });

      it('should be able to get own bookmark by id', () => {
        pactum
          .spec()
          .get('/bookmarks/$S{create_bookmark_id}')
          .expectStatus(200)
          .expectJsonMatch({
            id: like(1),
            title: like('string'),
            url: like('string'),
            description: like('string'),
            userId: like(1),
            createdAt: like('string'),
            updatedAt: like('string'),
          });
      });

      it('should not be able to get bookmark with invalid id', () => {
        return pactum.spec().get('/bookmarks/101').expectStatus(401);
      });
    });

    describe('Update bookmarks', () => {
      it('should not be able to update bookmark when not logged in', () => {
        return pactum
          .spec()
          .patch('/bookmarks/$S{create_bookmark_id}')
          .withBody({
            title: 'Updated Title',
          })
          .expectStatus(401);
      });

      it('should not be able to update bookmark with invalid id', () => {
        return pactum
          .spec()
          .patch('/bookmarks/101')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody({
            title: 'Updated Title',
          })
          .expectStatus(404);
      });

      it('should not be able to update bookmark with invalid data', () => {
        return pactum
          .spec()
          .patch('/bookmarks/$S{create_bookmark_id}')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody({
            title: '',
          })
          .expectStatus(400);
      });

      it('should be able to update bookmark', () => {
        return pactum
          .spec()
          .patch('/bookmarks/$S{create_bookmark_id}')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .withBody({
            title: 'Updated Title',
          })
          .expectStatus(200)
          .expectJsonMatch({
            id: like(1),
            title: 'Updated Title',
            url: like('string'),
            description: like('string'),
            userId: like(1),
            createdAt: like('string'),
            updatedAt: like('string'),
          });
      });
    });

    describe('Delete Bookmark', () => {
      it('should not be able to delete bookmark when not logged in', () => {
        return pactum
          .spec()
          .delete('/bookmarks/$S{create_bookmark_id}')
          .expectStatus(401);
      });

      it('should not be able to delete bookmark with invalid id', () => {
        return pactum
          .spec()
          .delete('/bookmarks/101')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .expectStatus(404);
      });

      it('should be able to delete bookmark', () => {
        return pactum
          .spec()
          .delete('/bookmarks/$S{create_bookmark_id}')
          .withHeaders({
            Authorization: 'Bearer $S{user_access_token}',
          })
          .expectStatus(204);
      });
    });
  });
});
