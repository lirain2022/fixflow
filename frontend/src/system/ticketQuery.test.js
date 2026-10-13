import {describe,it,expect} from 'vitest';
import {ticketQuery} from './ticketQuery';
describe('ticket filters',()=>{
  it('encodes the same applied conditions for lists and exports without pagination',()=>{
    const params=ticketQuery({search:'冷氣 & 3F',status:'ASSIGNED',priority:'HIGH',assigneeId:'42',overdue:true});
    expect(Object.fromEntries(params)).toEqual({query:'冷氣 & 3F',status:'ASSIGNED',priority:'HIGH',assigneeId:'42',overdue:'true'});
    expect(new URLSearchParams(params.toString()).get('query')).toBe('冷氣 & 3F');
    expect(params.has('page')).toBe(false);
  });
  it('does not send empty enum values',()=>expect(ticketQuery().toString()).toBe('query='));
  it('keeps the selected sort order in exports',()=>expect(ticketQuery({order:'PRIORITY'}).get('order')).toBe('PRIORITY'));
});
