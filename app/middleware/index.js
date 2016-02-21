import {json} from 'body-parser';

export {default as types} from './types';
export const body = json();
export {default as notFound} from './not-found';
export {default as error} from './error';
