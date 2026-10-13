import { expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createTicketStore } from './tickets/ticketStore';
import { memoryStorage, savedTicket } from './test/helpers';
const KEY = 'fixflow.tickets.v1';
const initial = () => memoryStorage({ [KEY]: JSON.stringify([savedTicket]) });
async function fillForm(user) {
  const dialog = within(screen.getByRole('dialog', { name: '新增工單' }));
  await user.type(dialog.getByLabelText('標題', { exact: true }), '飲水機無法加熱');
  await user.type(dialog.getByLabelText('問題描述', { exact: true }), '按下加熱按鈕沒有反應');
  await user.type(dialog.getByLabelText('位置', { exact: true }), '二樓茶水間');
  await user.selectOptions(dialog.getByLabelText('分類', { exact: true }), 'EQUIPMENT');
  return dialog;
}
it('adds a visible ticket and clears active filters', async () => {
  const user = userEvent.setup();
  render(<App store={createTicketStore(initial())} />);
  await user.type(screen.getByRole('searchbox', { name: '搜尋工單' }), '不存在的工單');
  await user.selectOptions(screen.getByLabelText('工單狀態'), 'CLOSED');
  await user.click(screen.getByRole('button', { name: '新增工單' }));
  const dialog = await fillForm(user);
  await user.click(dialog.getByRole('button', { name: '建立工單' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('工單已建立');
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.getByLabelText('工單狀態')).toHaveValue('ALL');
  expect(screen.getAllByText('飲水機無法加熱').length).toBeGreaterThan(0);
});
it('cancel does not create a ticket', async () => {
  const user = userEvent.setup(); const storage = initial();
  render(<App store={createTicketStore(storage)} />);
  await user.click(screen.getByRole('button', { name: '新增工單' }));
  await fillForm(user);
  await user.click(screen.getByRole('button', { name: '取消' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(JSON.parse(storage.getItem(KEY))).toHaveLength(1);
});
it('blank input is rejected and the first invalid field receives focus', async () => {
  const user = userEvent.setup(); const storage = initial();
  render(<App store={createTicketStore(storage)} />);
  await user.click(screen.getByRole('button', { name: '新增工單' }));
  await user.type(screen.getByLabelText('標題', { exact: true }), '   ');
  await user.click(screen.getByRole('button', { name: '建立工單' }));
  expect(screen.getByLabelText('標題', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('標題', { exact: true })).toHaveFocus();
  expect(JSON.parse(storage.getItem(KEY))).toHaveLength(1);
});
it('write failure preserves form values and does not claim success', async () => {
  const user = userEvent.setup(); const storage = initial();
  render(<App store={createTicketStore({ ...storage, setItem: () => { throw new Error('quota'); } })} />);
  await user.click(screen.getByRole('button', { name: '新增工單' }));
  const dialog = await fillForm(user);
  await user.click(dialog.getByRole('button', { name: '建立工單' }));
  expect(dialog.getByRole('alert')).toHaveTextContent('儲存');
  expect(dialog.getByLabelText('標題', { exact: true })).toHaveValue('飲水機無法加熱');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(JSON.parse(storage.getItem(KEY))).toHaveLength(1);
});
it('damaged data requires an explicit reset', async () => {
  const user = userEvent.setup(); const storage = memoryStorage({ [KEY]: '{broken' });
  render(<App store={createTicketStore(storage)} />);
  expect(screen.getByRole('alert')).toHaveTextContent('資料');
  expect(screen.getByRole('button', { name: '新增工單' })).toBeDisabled();
  expect(storage.getItem(KEY)).toBe('{broken');
  await user.click(screen.getByRole('button', { name: '重設展示資料' }));
  expect(screen.getByRole('button', { name: '新增工單' })).toBeEnabled();
  expect(JSON.parse(storage.getItem(KEY))).toHaveLength(6);
});
it('shows an empty state and lets the user clear filters', async () => {
  const user = userEvent.setup();
  render(<App store={createTicketStore(initial())} />);
  await user.type(screen.getByRole('searchbox'), '不存在');
  expect(screen.getByText('找不到符合條件的工單')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '清除篩選' }));
  expect(screen.getAllByText('冷氣漏水').length).toBeGreaterThan(0);
});
