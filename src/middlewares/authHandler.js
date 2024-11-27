import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

////  아이템 시뮬레이터 필수 기능 - 인증 미들웨어 구현 [조건]
// 1. Request의 Authorization 헤더에서 JWT를 가져와서 인증 된 사용자인지 확인하는 Middleware를 구현
// 1-1. "클라이언트에서는" 쿠키로 JWT를 전달하지 않습니다.
// 1-2. "오로지 Authorization 헤더로만 JWT를 전달"
//
// 2. 인증에 실패하는 경우에는 알맞은 Http Status Code와 에러 메세지를 반환 해야 합니다.
// 2-1. Authorization에 담겨 있는 값의 형식이 표준(Bearer <JWT Value>)과 일치하지 않는 경우
// 2-1-1. 위와 같은 형식을 통상적으로 "베어러-토큰"이라고 말을 합니다.
// 2-2. JWT의 유효기한이 지난 경우
// 2-3. JWT 검증(JWT Secret 불일치, 데이터 조작으로 인한 Signature 불일치 등)에 실패한 경우
//
// 3. 인증에 성공하는 경우에는 req.locals.user와 같은 곳에 인증 사용자 정보를 담고, 다음 동작을 진행합니다.
//
// 4. API에서 (JWT 인증 필요) 라고 마킹된 부분은 반드시 해당 인증 미들웨어를 거쳐야하니 참고해주세요!

export default async function (req, res, next) {
  const { authorization } = req.cookies;
  try {
    /*예외처리*/
    // 1. 토큰이 존제 하는지 없는지 확인.
    if (!authorization) {
      return next(new CustomError('로그인이 필요합니다.', 401));
    }
    // 2. 토큰이 "Bearer"토큰 인지 확인.
    const [tokenType, token] = authorization.split(' ');
    if (tokenType !== 'Bearer') {
      return next(new CustomError('토큰 타입이 일치하지 않습니다.', 401));
    }
    // 3. 토큰 검증 및 디코딩
    const decodedToken = jwt.verify(token, 'custom-secret-key');
    
    // 4. 현재 토큰의 정보를 가진 db 리플레시 토큰 데이터가 없다면?
    if(global.refreshTokens.find(user => user.userName === decodedToken.userName)) {
      return next(new CustomError('잘못된 토큰 입니다.', 401));
    }

    /*여기까지 오면 안전!*/
    req.user = decodedToken.userName;
    next();
  } catch (error) {
    // 인증 실패하면 에러 반환.
    return next(new CustomError('비정상적인 요청.', 401));
  }
}
