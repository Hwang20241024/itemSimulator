import express from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import ErrorHandlingMiddleware from './middlewares/errorHandler.js';

const app = express();
const PORT = 3018;

// 비밀 키는 외부에 노출되면 안되겠죠? 그렇기 때문에, .env 파일을 이용해 비밀 키를 관리해야합니다.
const ACCESS_TOKEN_SECRET_KEY = `Sparta`; // Access Token의 비밀 키를 정의합니다.
const REFRESH_TOKEN_SECRET_KEY = `YunseokSecretKey`; // Refresh Token의 비밀 키를 정의합니다.

app.use(express.json());
app.use(cookieParser());

// 에러 처리 미들 웨어. 
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
