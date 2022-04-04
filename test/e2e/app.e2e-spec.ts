import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as pactum from 'pactum';
import { like } from 'pactum-matchers';
import { SignupDto } from 'src/auth/dto';
import { PrismaService } from 'src/prisma/prisma.service';

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

  describe('Auth', () => {
    const signupDto: SignupDto = {
      email: '',
      password: '',
    };
    const invalidEmail = 'invalidemail@testmail.com';
    const invalidPassword = 'not-super-secret';
    const validEmail = 'abdadeel@testmail.com';
    const validPassword = 'abCD123!';

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
  });

  // describe('Bookmark', () => {});
});
