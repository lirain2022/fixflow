import {describe,it,expect} from 'vitest';
import {ticketEditReason} from './ticketEditing';
describe('ticket edit availability',()=>{
  const ticket={status:'OPEN',createdBy:{id:1}};
  it('allows own open reports and admin active reports',()=>{
    expect(ticketEditReason(ticket,{id:1,role:'CUSTOMER'})).toBe('');
    expect(ticketEditReason({...ticket,status:'ASSIGNED'},{id:2,role:'ADMIN'})).toBe('');
  });
  it('explains why completed reports and non-owner metadata edits are unavailable',()=>{
    expect(ticketEditReason({...ticket,status:'CLOSED'},{id:2,role:'ADMIN'})).toBe('工單已結束');
    expect(ticketEditReason({...ticket,status:'ASSIGNED'},{id:1,role:'CUSTOMER'})).toBe('');
    expect(ticketEditReason(ticket,{id:2,role:'CUSTOMER'})).not.toBe('');
    expect(ticketEditReason(ticket,{id:2,role:'TECHNICIAN'})).toBe('只能編輯你建立或被指派的工單');
  });
});
