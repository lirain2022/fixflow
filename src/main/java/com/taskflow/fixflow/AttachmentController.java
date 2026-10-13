package com.taskflow.fixflow;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController @RequestMapping("/api/tickets/{ticketId}/attachments")
public class AttachmentController {
    private final TicketService tickets;private final AttachmentRepository attachments;private final AuthService auth;private final Path directory;
    public AttachmentController(TicketService tickets,AttachmentRepository attachments,AuthService auth,@Value("${fixflow.upload-dir:./data/uploads}") String directory){this.tickets=tickets;this.attachments=attachments;this.auth=auth;this.directory=Path.of(directory).toAbsolutePath().normalize();}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional
    public Object upload(Authentication a,@PathVariable Long ticketId,@RequestParam("file") MultipartFile file)throws IOException{
        User actor=auth.current(a);Ticket ticket=tickets.find(ticketId,actor,true);tickets.active(ticket);
        if(file.isEmpty()||file.getSize()>5*1024*1024)throw new ApiException(400,"請選擇 5 MB 以內的 PNG 或 JPEG 圖片");
        if(attachments.countByTicketId(ticketId)>=10)throw new ApiException(400,"每筆工單最多 10 張圖片");
        byte[] sanitized;String format;
        try(var stream=ImageIO.createImageInputStream(file.getInputStream())){
            var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())throw new ApiException(400,"檔案不是有效圖片");var reader=readers.next();
            try{reader.setInput(stream);format=reader.getFormatName().toLowerCase(Locale.ROOT);if(!Set.of("png","jpeg").contains(format))throw new ApiException(400,"只支援 PNG 和 JPEG 圖片");
                if((long)reader.getWidth(0)*reader.getHeight(0)>20_000_000)throw new ApiException(400,"圖片解析度過大，請縮小後再上傳");
                var output=new ByteArrayOutputStream();ImageIO.write(reader.read(0),format,output);sanitized=output.toByteArray();
            }finally{reader.dispose();}
        }catch(IOException e){throw new ApiException(400,"無法讀取此圖片，請重新匯出後再試");}
        if(sanitized.length>5*1024*1024)throw new ApiException(400,"圖片處理後超過 5 MB，請縮小後再試");
        Attachment attachment=new Attachment();attachment.ticket=ticket;attachment.uploadedBy=actor;
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("photo").replaceAll("[\\\\/\\p{Cntrl}]","_");attachment.fileName=name.substring(0,Math.min(180,name.length()));
        attachment.storageKey=UUID.randomUUID()+"."+format;attachment.contentType="image/"+format;attachment.size=sanitized.length;
        Files.createDirectories(directory);Path destination=directory.resolve(attachment.storageKey);Files.write(destination,sanitized,StandardOpenOption.CREATE_NEW);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)try{Files.deleteIfExists(destination);}catch(IOException ignored){}}});
        attachments.saveAndFlush(attachment);tickets.log(ticket,actor,"上傳圖片："+attachment.fileName);return tickets.get(ticketId,actor);
    }
    @GetMapping("/{id}") @Transactional(readOnly=true)
    public ResponseEntity<ByteArrayResource> download(Authentication a,@PathVariable Long ticketId,@PathVariable Long id)throws IOException{
        tickets.find(ticketId,auth.current(a),false);Attachment attachment=attachments.findById(id).filter(x->x.ticket.getId().equals(ticketId)).orElseThrow(ApiException::missing);
        Path path=directory.resolve(attachment.storageKey).normalize();if(!path.startsWith(directory)||!Files.isRegularFile(path))throw new ApiException(404,"圖片檔案不存在");
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(attachment.contentType)).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(attachment.fileName,java.nio.charset.StandardCharsets.UTF_8).build().toString()).header(HttpHeaders.CACHE_CONTROL,"private, no-store").body(new ByteArrayResource(Files.readAllBytes(path)));
    }
}
