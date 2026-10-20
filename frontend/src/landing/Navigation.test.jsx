import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect} from 'vitest';
import Navigation from './Navigation';
it('opens service links by click and closes by Escape with focus restored',()=>{
 render(<Navigation/>);
 const trigger=screen.getByRole('button',{name:'服務項目'});
 expect(trigger).toHaveAttribute('aria-expanded','false');
 fireEvent.click(trigger);
 expect(trigger).toHaveAttribute('aria-expanded','true');
 expect(screen.getByRole('link',{name:/網路系統/})).toHaveAttribute('href','/repair.html?service=network');
 fireEvent.keyDown(document,{key:'Escape'});
 expect(trigger).toHaveAttribute('aria-expanded','false');
 expect(trigger).toHaveFocus();
 expect(screen.getByRole('link',{name:'維修流程'})).toHaveAttribute('href','/process.html');
 expect(screen.getByRole('link',{name:'線上報修'})).toHaveAttribute('href','/repair.html');
});
