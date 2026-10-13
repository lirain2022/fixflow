import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import NotificationCenter from './NotificationCenter';
import NotificationBell from './NotificationBell';

const note={id:1,ticketId:9,ticketNo:'FIX-009',title:'冷氣漏水',message:'工單已派工',readAt:null,createdAt:'2026-10-03T00:00:00Z'};
it('loads scoped notifications, filters unread and marks all read without optimistic false success',async()=>{
  let read=false;const changed=vi.fn();const api=vi.fn(async(path,method)=>{
    if(method==='PATCH'){read=true;return null;}
    return {items:[{...note,readAt:read?'2026-10-03T01:00:00Z':null}],total:1,totalPages:1,unreadCount:read?0:1};
  });
  render(<NotificationCenter api={api} user={{id:1,role:'CUSTOMER'}} onRead={changed}/>);
  expect(await screen.findByText('冷氣漏水')).toBeVisible();fireEvent.click(screen.getByRole('checkbox',{name:'只看未讀'}));await waitFor(()=>expect(api).toHaveBeenCalledWith(expect.stringContaining('unreadOnly=true'),'GET',null,expect.any(Object)));
  fireEvent.click(screen.getByRole('button',{name:'全部標為已讀'}));await waitFor(()=>expect(api).toHaveBeenCalledWith('/notifications/read-all','PATCH'));expect(changed).toHaveBeenCalled();
  await waitFor(()=>expect(screen.getByRole('button',{name:'全部標為已讀'})).toBeDisabled());
});
it('shows a failed acknowledgement and keeps the notification unread',async()=>{
  const api=vi.fn(async(path,method)=>{if(method==='PATCH')throw new Error('讀取失敗');return {items:[note],total:1,totalPages:1,unreadCount:1};});
  render(<NotificationCenter api={api} user={{id:1,role:'CUSTOMER'}} onRead={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'標為已讀'}));expect(await screen.findByRole('alert')).toHaveTextContent('讀取失敗');expect(screen.getByText('未讀')).toBeVisible();
});
it('shows actual unread count and opens the center',async()=>{
  const open=vi.fn();render(<NotificationBell api={async()=>({unreadCount:4})} onOpen={open} revision={0}/>);const button=await screen.findByRole('button',{name:'通知中心，4 則未讀'});fireEvent.click(button);expect(open).toHaveBeenCalled();
});
