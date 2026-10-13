import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import UnlinkedAssetTickets from './UnlinkedAssetTickets';
it('shows unlinked closed costs and links an existing asset with the displayed revision',async()=>{
 const ticket={id:9,version:4,ticketNo:'FIX-9',title:'Forgotten pump',status:'CLOSED',location:'B1',repairCostSummary:{recordedRepairs:1,recordedTotal:350}},asset={id:5,code:'PUMP-5',name:'Pump',enabled:true};
 const changed=vi.fn(),api=vi.fn(async(path,method)=>method==='PATCH'?{...ticket,asset}:path.startsWith('/assets?')?{items:[asset],total:1}:{items:[ticket],total:1,totalPages:1});
 render(<UnlinkedAssetTickets api={api} revision={0} onChanged={changed} onOpenTicket={()=>{}} onOpenAsset={()=>{}}/>);
 expect(await screen.findByText(/NT\$ 350.00/)).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'補連結設備 FIX-9'}));
 await screen.findByRole('option',{name:'PUMP-5 · Pump'});fireEvent.change(screen.getByLabelText('報修設備'),{target:{value:'5'}});fireEvent.click(screen.getByRole('button',{name:'確認連結'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/tickets/9/asset','PATCH',{assetId:5,version:4}));expect(changed).toHaveBeenCalled();
});
