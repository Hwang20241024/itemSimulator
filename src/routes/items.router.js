// 라이브러리 import
import express from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// 모듈 import
import { prisma } from '../utils/prisma/index.js';
import { PrismaClient } from '@prisma/client';
import authMiddleware from '../middlewares/authHandler.js';
import CustomError from '../utils/errors/customError.js';
//import  error  from 'winston';

// 라우터 생성.
const router = express.Router();

// dotenv 사용.
dotenv.config();

/* 아이템시뮬레이터 - 아이템 생성 API */
router.post('/items/add', async (req, res, next) => {
  const { itemName, stats, price } = req.body;

  const itemExists = await prisma.items.findUnique({
    where: {
      itemName: itemName, // db에 Accounts 테이블에 "userName" 있는지 확인.
    },
  });
  // 2-1. 이미 있다면 회원가입은 하면안된다.
  if (itemExists) {
    return next(new CustomError('이미 존재하는 아이템 입니다.', 409));
  }


  // 아이템 생성.
  const newItem = await prisma.items.create({
    data: {
      itemName: itemName,
      price: price, 
    },
  });

  // 아이템 능력
  const newItemStats = await prisma.itemStats.create({
    data: {
      itemId: newItem.itemId,
      stats: stats, 
    },
  });
  return res.status(201).json({message: ` [${newItem.itemName}] 아이템 생성 완료.`, } )
});


/** 아이템시뮬레이터 - 아이템 수정 API **/
router.patch("/items/update/:itemId", async (req, res, next) => {
  const {itemId} = req.params;
  const { itemName, stats } = req.body;

  // 아이템 내용 수정.
  const itemExists = await prisma.items.update({
    where: {
      itemId: +itemId, 
    },
    data:{
      itemName: itemName
    },
    
  });

  // 아이템 스텟 수정.
  const itemStatsExists = await prisma.itemStats.update({
    where: {
      itemId: +itemExists.itemId, 
    },
    data: {
      stats: stats, 
    },
  });

  return res.status(201).json({message: ` [${itemExists.itemName}] 아이템 수정 완료.`, } )

})

/** 아이템시뮬레이터 - 아이템 상세 조회 API **/
router.get("/items/get", async (req, res, next) => {
  const getItems = await prisma.items.findMany({
    include: {
      itemStats: {
        select: {
          stats: true, // 능력치 포함
        },
      },
    },
  });

  // 원하는 형태로 데이터 구조 변경
  const formattedItems = getItems.map(item => ({
    itemId: item.itemId,
    itemName: item.itemName,
    stats: item.itemStats ? item.itemStats.stats : {}, // stats가 존재할 경우만 포함
    price: item.price
  }));

  return res.status(201).json(formattedItems)


})

export default router;
