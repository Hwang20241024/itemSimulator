// 라이브러리 import
import express from 'express';
import cookieParser from 'cookie-parser';

// 모듈 import
import ErrorHandlingMiddleware from './middlewares/errorHandler.js';
import UsersRouter from './routes/users.router.js';

const app = express();
const PORT = 3018;

app.use(express.json());
app.use(cookieParser());

// 라우터 연결
app.use('/itemSimulator', [UsersRouter]);

// 에러 처리 미들 웨어. 
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
