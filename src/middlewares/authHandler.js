import jwt from 'jsonwebtoken';
import CustomError from '../utils/errors/customError.js';

/** 인증미들웨어. **/
export default async function (req, res, next) {
  const authorization = req.headers['authorization'];

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
    
    try {
      // 3. 토큰 검증 및 디코딩
      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET_KEY
      );

      // 4. 현재 토큰의 정보를 가진 db 리플레시 토큰 데이터가 없다면?
      const isUserExist = global.refreshTokens.some(
        (user) => user.userName === decodedToken.userName
      );
      console.log(isUserExist.userName);
      //console.log(user.userName);

      if (!isUserExist) {
        console.log('엑세스: ' + decodedToken.userName);
        return next(new CustomError('잘못된 토큰 입니다.', 401));
      }
      /*여기까지 오면 안전!*/
      req.user = decodedToken;
      next();
    } catch (error) {
      // 토큰이 만료 되면 로그인해야한다.
      if (error.name === 'TokenExpiredError') {
        return next(new CustomError('로그인을 해주세요.', 401));
      }
    }
  } catch (error) {
    // 인증 실패하면 에러 반환.
    console.error('JWT Verify Error:', error.message);
    return next(new CustomError('비정상적인 요청.', 401));
  }
}
