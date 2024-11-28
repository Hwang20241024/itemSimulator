// 라이브러리 import
import express from 'express';
import cookieParser from 'cookie-parser';

// 모듈 import
import ErrorHandlingMiddleware from './middlewares/errorHandler.js';
import UsersRouter from './routes/users.router.js';
import ItemsRouter from './routes/items.router.js';
import ShopRouter from './routes/shop.router.js';
import CharacterRouter from './routes/character.router.js';
import AtionsRouter from './routes/actions.router.js';
import { prisma } from './utils/prisma/index.js';

const app = express();
const PORT = 3018;

// 최초 실행 감지.
if (!global.hasRun) {
  // 최초 실행 시 DB 연결 또는 초기화 작업
  console.log('서버 최초 실행, DB 초기화 중...');
  global.refreshTokens = [];

  const user = await prisma.accounts.findMany({
    select: {
      userName: true, // 이름 가져오기
      refreshToken: true, // 리프레시 키 가져오기
    },
  });

  if (user.length !== 0) {
    for (let value of user) {
      global.refreshTokens.push({
        userName: value.userName,
        refreshToken: value.refreshToken,
      });
    }
    console.log('서버 최초 실행, DB 세팅중...');
  }
  //console.log(global.refreshTokens);

  console.log('서버 최초 실행, DB 초기화 완료...');
  global.hasRun = true;
}

app.use(express.json());
app.use(cookieParser());

// 라우터 연결
app.use('/itemSimulator', [
  UsersRouter,
  ItemsRouter,
  ShopRouter,
  CharacterRouter,
  AtionsRouter,
]);

// 에러 처리 미들 웨어.
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
